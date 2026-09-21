"""
RiskPilot 8D - CSV Ingestion Engine
Parses historical OHLCV CSV data, maps flexible column headers, converts custom
timezones to UTC, and invokes the CandleBuilder for validation and aggregation.
"""

import csv
import io
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
import zoneinfo

from data.candle_builder import CandleBuilder, CandleRecord


class CSVLoader:
    """
    Parses CSV text or file streams into typed, validated CandleRecords.
    """

    # Column header mapping heuristics
    DATE_ALIASES = ["datetime", "timestamp", "date", "time", "date_time", "ts"]
    OPEN_ALIASES = ["open", "o", "open_price"]
    HIGH_ALIASES = ["high", "h", "high_price"]
    LOW_ALIASES = ["low", "l", "low_price"]
    CLOSE_ALIASES = ["close", "c", "close_price"]
    VOLUME_ALIASES = ["volume", "vol", "v", "qty", "quantity"]

    @classmethod
    def _find_column(cls, headers: List[str], aliases: List[str]) -> Optional[str]:
        headers_lower = {h.strip().lower(): h for h in headers}
        for alias in aliases:
            if alias in headers_lower:
                return headers_lower[alias]
        return None

    @classmethod
    def parse_csv(
        cls,
        csv_content: str,
        source_timezone: str = "UTC",
        expected_timeframe: str = "5m",
    ) -> Tuple[List[CandleRecord], Dict[str, Any]]:
        """
        Parse CSV content string. Converts timestamps from source_timezone into UTC.
        """
        reader = csv.DictReader(io.StringIO(csv_content.strip()))
        if not reader.fieldnames:
            raise ValueError("CSV has no header row or is empty")

        date_col = cls._find_column(reader.fieldnames, cls.DATE_ALIASES)
        open_col = cls._find_column(reader.fieldnames, cls.OPEN_ALIASES)
        high_col = cls._find_column(reader.fieldnames, cls.HIGH_ALIASES)
        low_col = cls._find_column(reader.fieldnames, cls.LOW_ALIASES)
        close_col = cls._find_column(reader.fieldnames, cls.CLOSE_ALIASES)
        vol_col = cls._find_column(reader.fieldnames, cls.VOLUME_ALIASES)

        if not all([date_col, open_col, high_col, low_col, close_col]):
            missing = []
            if not date_col: missing.append("DateTime")
            if not open_col: missing.append("Open")
            if not high_col: missing.append("High")
            if not low_col: missing.append("Low")
            if not close_col: missing.append("Close")
            raise ValueError(f"Missing mandatory OHLC columns: {', '.join(missing)}")

        try:
            tz = zoneinfo.ZoneInfo(source_timezone)
        except Exception:
            tz = timezone.utc

        raw_records: List[Dict[str, Any]] = []
        parse_errors = 0

        for row in reader:
            try:
                date_str = row[date_col].strip()
                # Parse timestamp
                dt: Optional[datetime] = None
                for fmt in (
                    "%Y-%m-%d %H:%M:%S",
                    "%Y-%m-%d %H:%M",
                    "%Y-%m-%dT%H:%M:%S",
                    "%Y-%m-%dT%H:%M:%SZ",
                    "%Y-%m-%d",
                    "%d-%m-%Y %H:%M:%S",
                    "%d/%m/%Y %H:%M:%S",
                ):
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        break
                    except ValueError:
                        continue

                if dt is None:
                    # Try fromisoformat or unix timestamp
                    if date_str.isdigit():
                        dt = datetime.fromtimestamp(int(date_str), tz=timezone.utc)
                    else:
                        dt = datetime.fromisoformat(date_str)

                # Attach source timezone if naive, then convert to UTC
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=tz)
                dt = dt.astimezone(timezone.utc)

                raw_records.append(
                    {
                        "time": dt,
                        "open": Decimal(row[open_col]),
                        "high": Decimal(row[high_col]),
                        "low": Decimal(row[low_col]),
                        "close": Decimal(row[close_col]),
                        "volume": Decimal(row[vol_col]) if vol_col and row.get(vol_col) else Decimal("0"),
                    }
                )
            except Exception:
                parse_errors += 1
                continue

        candles, diagnostics = CandleBuilder.clean_and_sort_candles(
            raw_records, expected_timeframe=expected_timeframe
        )
        diagnostics["parse_errors"] = parse_errors
        diagnostics["source_timezone"] = source_timezone

        return candles, diagnostics

    @classmethod
    def generate_sample_csv(cls, num_bars: int = 120, base_price: float = 500.0) -> str:
        """
        Generates a valid sample CSV dataset of 5-minute bars for immediate testing and backtest demo.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp", "Open", "High", "Low", "Close", "Volume"])

        import math
        start_ts = 1704067200 # 2024-01-01 00:00:00 UTC
        current_price = base_price

        for i in range(num_bars):
            ts = datetime.fromtimestamp(start_ts + i * 300, tz=timezone.utc)
            delta = math.sin(i * 0.15) * 1.8 + (math.cos(i * 0.08) * 0.9)
            o = current_price
            c = round(o + delta, 2)
            h = round(max(o, c) + abs(math.sin(i * 0.3) * 1.2) + 0.2, 2)
            l = round(min(o, c) - abs(math.cos(i * 0.3) * 1.2) - 0.2, 2)
            v = int(1000 + abs(math.sin(i * 0.4) * 4000) + (500 if i % 10 == 0 else 0))

            writer.writerow([ts.strftime("%Y-%m-%d %H:%M:%S"), o, h, l, c, v])
            current_price = c

        return output.getvalue()
