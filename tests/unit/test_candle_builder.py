"""
Unit Tests for Candle Builder, CSV Loader & Data Quality Engine
"""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from data.candle_builder import CandleBuilder, CandleRecord
from data.csv_loader import CSVLoader
from data.data_quality import DataQualityMonitor


def test_validate_ohlc_impossible_conditions():
    # Valid candle
    valid, errors = CandleBuilder.validate_ohlc(
        Decimal("100"), Decimal("105"), Decimal("95"), Decimal("102"), Decimal("1000")
    )
    assert valid is True
    assert len(errors) == 0

    # High < Low
    valid, errors = CandleBuilder.validate_ohlc(
        Decimal("100"), Decimal("90"), Decimal("95"), Decimal("92"), Decimal("1000")
    )
    assert valid is False
    assert any("High" in e and "Low" in e for e in errors)

    # Low > Open
    valid, errors = CandleBuilder.validate_ohlc(
        Decimal("100"), Decimal("110"), Decimal("102"), Decimal("105"), Decimal("1000")
    )
    assert valid is False

    # Negative Volume
    valid, errors = CandleBuilder.validate_ohlc(
        Decimal("100"), Decimal("105"), Decimal("95"), Decimal("102"), Decimal("-50")
    )
    assert valid is False


def test_clean_and_sort_candles_duplicates_and_order():
    raw = [
        {"time": "2024-01-01T00:10:00Z", "open": 102, "high": 105, "low": 101, "close": 104, "volume": 100},
        {"time": "2024-01-01T00:00:00Z", "open": 100, "high": 103, "low": 99, "close": 101, "volume": 100},
        {"time": "2024-01-01T00:05:00Z", "open": 101, "high": 104, "low": 100, "close": 102, "volume": 100},
        # Duplicate timestamp
        {"time": "2024-01-01T00:05:00Z", "open": 101, "high": 104, "low": 100, "close": 102, "volume": 100},
        # Impossible OHLC (should be dropped)
        {"time": "2024-01-01T00:15:00Z", "open": 104, "high": 90, "low": 105, "close": 95, "volume": 100},
    ]

    cleaned, diag = CandleBuilder.clean_and_sort_candles(raw, expected_timeframe="5m")

    assert len(cleaned) == 3
    assert diag["duplicates_removed"] == 1
    assert diag["impossible_ohlc_dropped"] == 1
    assert diag["out_of_order_detected"] >= 1

    # Check chronological ordering
    assert cleaned[0].time < cleaned[1].time < cleaned[2].time
    assert cleaned[0].open == Decimal("100")
    assert cleaned[1].open == Decimal("101")
    assert cleaned[2].open == Decimal("102")


def test_timeframe_aggregation_5m_to_1h():
    # Create 12 consecutive 5-minute candles (60 minutes)
    base_ts = 1704067200 # 2024-01-01 00:00:00 UTC
    candles: list[CandleRecord] = []
    for i in range(12):
        dt = datetime.fromtimestamp(base_ts + i * 300, tz=timezone.utc)
        candles.append(
            CandleRecord(
                time=dt,
                open=Decimal(str(100 + i)),
                high=Decimal(str(105 + i)),
                low=Decimal(str(95 + i)),
                close=Decimal(str(102 + i)),
                volume=Decimal("100"),
                trades_count=10,
                is_complete=True,
            )
        )

    aggregated = CandleBuilder.aggregate_candles(candles, target_timeframe="1h")

    assert len(aggregated) == 1
    hourly = aggregated[0]
    assert hourly.open == Decimal("100") # First bar open
    assert hourly.close == Decimal("113") # Last bar close (102 + 11)
    assert hourly.high == Decimal("116") # Max high (105 + 11)
    assert hourly.low == Decimal("95") # Min low (95 + 0)
    assert hourly.volume == Decimal("1200") # 12 * 100


def test_csv_loader_with_timezone():
    sample_csv = CSVLoader.generate_sample_csv(num_bars=30)
    candles, diag = CSVLoader.parse_csv(sample_csv, source_timezone="UTC", expected_timeframe="5m")

    assert len(candles) == 30
    assert diag["valid_output"] == 30
    assert diag["parse_errors"] == 0
    assert candles[0].time.tzinfo == timezone.utc


def test_data_quality_monitor():
    sample_csv = CSVLoader.generate_sample_csv(num_bars=20)
    candles, diag = CSVLoader.parse_csv(sample_csv)

    assessment = DataQualityMonitor.evaluate(
        symbol="TEST",
        timeframe="5m",
        candles=candles,
        diagnostics=diag,
        feed_latency_ms=45.0,
    )

    assert assessment.symbol == "TEST"
    assert assessment.status == "OPTIMAL"
    assert assessment.is_valid_for_signals is True
    assert assessment.feed_latency_ms == 45.0
