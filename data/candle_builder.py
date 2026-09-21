"""
RiskPilot 8D - Candle Builder & Timeframe Aggregation Engine
Builds uniform, timezone-normalized, validated OHLCV time-series bars.
Strictly converts to UTC internally and detects anomalies, gaps, and corrupted bars.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class CandleRecord(BaseModel):
    time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    trades_count: int = 0
    is_complete: bool = True
    anomalies: List[str] = Field(default_factory=list)


TIMEFRAME_SECONDS_MAP = {
    "1m": 60,
    "3m": 180,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


class CandleBuilder:
    """
    Ingests raw OHLCV records, validates integrity, removes duplicate bars,
    detects out-of-order sequence, and resamples to higher timeframes.
    """

    @staticmethod
    def validate_ohlc(
        open_p: Decimal, high_p: Decimal, low_p: Decimal, close_p: Decimal, volume: Decimal
    ) -> Tuple[bool, List[str]]:
        """
        Detect impossible OHLC conditions.
        Returns (is_valid, list_of_error_reasons).
        """
        errors: List[str] = []
        if open_p <= Decimal("0"):
            errors.append("Open price must be positive")
        if high_p <= Decimal("0"):
            errors.append("High price must be positive")
        if low_p <= Decimal("0"):
            errors.append("Low price must be positive")
        if close_p <= Decimal("0"):
            errors.append("Close price must be positive")
        if volume < Decimal("0"):
            errors.append("Volume cannot be negative")

        if high_p < low_p:
            errors.append(f"High ({high_p}) is lower than Low ({low_p})")
        if high_p < open_p:
            errors.append(f"High ({high_p}) is lower than Open ({open_p})")
        if high_p < close_p:
            errors.append(f"High ({high_p}) is lower than Close ({close_p})")
        if low_p > open_p:
            errors.append(f"Low ({low_p}) is higher than Open ({open_p})")
        if low_p > close_p:
            errors.append(f"Low ({low_p}) is higher than Close ({close_p})")

        return (len(errors) == 0, errors)

    @staticmethod
    def normalize_utc(dt: datetime) -> datetime:
        """Enforce UTC timezone aware datetime."""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @classmethod
    def clean_and_sort_candles(
        cls,
        raw_candles: List[Dict[str, Any]],
        expected_timeframe: str = "5m",
    ) -> Tuple[List[CandleRecord], Dict[str, Any]]:
        """
        Process a list of candle dictionaries:
        - Ensures UTC timezone
        - Detects impossible OHLC values (drops or flags them)
        - Removes duplicates (keeps newest by record order)
        - Detects out-of-order candles and sorts chronologically
        - Detects missing candle intervals
        """
        valid_candles: List[CandleRecord] = []
        seen_timestamps = set()
        duplicates_count = 0
        impossible_count = 0
        out_of_order_count = 0

        # Sort raw list and detect out of order
        last_seen_dt: Optional[datetime] = None

        parsed_items: List[Tuple[datetime, Dict[str, Any]]] = []
        for raw in raw_candles:
            raw_dt = raw["time"]
            if isinstance(raw_dt, (int, float)):
                dt = datetime.fromtimestamp(raw_dt, tz=timezone.utc)
            elif isinstance(raw_dt, str):
                dt = datetime.fromisoformat(raw_dt.replace("Z", "+00:00"))
            else:
                dt = raw_dt
            dt = cls.normalize_utc(dt)

            if last_seen_dt and dt < last_seen_dt:
                out_of_order_count += 1
            last_seen_dt = dt

            parsed_items.append((dt, raw))

        # Sort strictly by timestamp
        parsed_items.sort(key=lambda x: x[0])

        for dt, raw in parsed_items:
            # Duplicate check
            if dt in seen_timestamps:
                duplicates_count += 1
                continue
            seen_timestamps.add(dt)

            o = Decimal(str(raw["open"]))
            h = Decimal(str(raw["high"]))
            l = Decimal(str(raw["low"]))
            c = Decimal(str(raw["close"]))
            v = Decimal(str(raw.get("volume", 0)))
            trades = int(raw.get("trades_count", 0))
            is_complete = bool(raw.get("is_complete", True))

            is_valid, anomalies = cls.validate_ohlc(o, h, l, c, v)
            if not is_valid:
                impossible_count += 1
                continue

            valid_candles.append(
                CandleRecord(
                    time=dt,
                    open=o,
                    high=h,
                    low=l,
                    close=c,
                    volume=v,
                    trades_count=trades,
                    is_complete=is_complete,
                    anomalies=anomalies,
                )
            )

        # Detect missing intervals
        step_seconds = TIMEFRAME_SECONDS_MAP.get(expected_timeframe, 300)
        missing_intervals: List[Tuple[datetime, datetime]] = []
        missing_count = 0

        for i in range(1, len(valid_candles)):
            prev_t = valid_candles[i - 1].time
            curr_t = valid_candles[i].time
            diff = (curr_t - prev_t).total_seconds()
            if diff > step_seconds:
                missing_steps = int(diff // step_seconds) - 1
                missing_count += missing_steps
                missing_intervals.append((prev_t, curr_t))

        diagnostics = {
            "total_input": len(raw_candles),
            "valid_output": len(valid_candles),
            "duplicates_removed": duplicates_count,
            "impossible_ohlc_dropped": impossible_count,
            "out_of_order_detected": out_of_order_count,
            "missing_candles_count": missing_count,
            "missing_intervals": missing_intervals[:20],
        }

        return valid_candles, diagnostics

    @classmethod
    def aggregate_candles(
        cls,
        source_candles: List[CandleRecord],
        target_timeframe: str = "1h",
    ) -> List[CandleRecord]:
        """
        Aggregate base candles into target timeframe (e.g. 5m -> 1h).
        Aligns bucket starts to exact target timeframe boundaries.
        """
        target_seconds = TIMEFRAME_SECONDS_MAP.get(target_timeframe, 3600)
        if not source_candles:
            return []

        buckets: Dict[int, List[CandleRecord]] = {}
        for c in source_candles:
            ts = int(c.time.timestamp())
            bucket_key = (ts // target_seconds) * target_seconds
            if bucket_key not in buckets:
                buckets[bucket_key] = []
            buckets[bucket_key].append(c)

        aggregated: List[CandleRecord] = []
        for bucket_key in sorted(buckets.keys()):
            bars = buckets[bucket_key]
            bucket_time = datetime.fromtimestamp(bucket_key, tz=timezone.utc)

            bucket_open = bars[0].open
            bucket_high = max(b.high for b in bars)
            bucket_low = min(b.low for b in bars)
            bucket_close = bars[-1].close
            bucket_volume = sum(b.volume for b in bars)
            bucket_trades = sum(b.trades_count for b in bars)
            is_complete = all(b.is_complete for b in bars)

            aggregated.append(
                CandleRecord(
                    time=bucket_time,
                    open=bucket_open,
                    high=bucket_high,
                    low=bucket_low,
                    close=bucket_close,
                    volume=bucket_volume,
                    trades_count=bucket_trades,
                    is_complete=is_complete,
                )
            )

        return aggregated
