"""
Unit Tests for Adaptive Zones and Higher-Timeframe Pivots
"""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from data.candle_builder import CandleRecord
from engine.adaptive_zones import AdaptiveZonesEngine
from engine.htf_pivots import HTFPivotEngine


def create_test_candle(time_str: str, o: float, h: float, l: float, c: float, is_comp: bool = True) -> CandleRecord:
    dt = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    return CandleRecord(
        time=dt,
        open=Decimal(str(o)),
        high=Decimal(str(h)),
        low=Decimal(str(l)),
        close=Decimal(str(c)),
        volume=Decimal("1000"),
        is_complete=is_comp,
    )


def test_adaptive_zones_7_partitions():
    # Build 10 candles with low=100 and high=170 (range = 70)
    # Zone boundaries for 7 partitions with step=10:
    # [100, 110, 120, 130, 140, 150, 160, 170]
    candles = [
        create_test_candle(f"2024-01-01T0{i}:00:00Z", 100 + i * 5, 170, 100, 135)
        for i in range(10)
    ]

    result = AdaptiveZonesEngine.calculate(
        symbol="TEST",
        timeframe="5m",
        candles=candles,
        lookback_bars=10,
        num_zones=7,
    )

    assert result is not None
    assert result.num_zones == 7
    assert result.rolling_low == 100.0
    assert result.rolling_high == 170.0
    assert result.range_span == 70.0

    # Price is 135 -> between 130 and 140 -> index 3 (Zone 4: Equilibrium / Mean)
    assert result.current_zone_index == 3
    assert "Zone 4" in result.current_zone_label
    assert result.breakout_status == "IN_RANGE"
    assert result.distance_to_upper == 5.0  # 140 - 135
    assert result.distance_to_lower == 5.0  # 135 - 130


def test_adaptive_zones_breakout_above():
    candles = [
        create_test_candle(f"2024-01-01T0{i}:00:00Z", 100, 150, 100, 120)
        for i in range(5)
    ]
    # Add a breakout bar
    candles.append(create_test_candle("2024-01-01T05:00:00Z", 140, 190, 135, 185))

    result = AdaptiveZonesEngine.calculate(
        symbol="TEST",
        timeframe="5m",
        candles=candles,
        lookback_bars=6,
        num_zones=7,
    )

    assert result is not None
    assert result.breakout_status == "IN_RANGE" # Included in lookback, so rolling_high updated to 190
    assert result.rolling_high == 190.0


def test_htf_pivot_midpoint_no_lookahead():
    # Previous completed 1h candle
    htf_1 = create_test_candle("2024-01-01T00:00:00Z", 100, 110, 90, 105, is_comp=True)
    # Current active 1h candle (incomplete)
    htf_2 = create_test_candle("2024-01-01T01:00:00Z", 105, 150, 80, 120, is_comp=False)

    # Current 5m candle inside the 01:00 hour
    curr_5m = create_test_candle("2024-01-01T01:15:00Z", 106, 108, 104, 107, is_comp=True)

    result = HTFPivotEngine.calculate(
        symbol="TEST",
        current_candle=curr_5m,
        htf_candles=[htf_1, htf_2],
        htf_timeframe="1h",
        formula="MIDPOINT",
    )

    assert result is not None
    # Must use htf_1 because htf_2 is not completed and starts at/after 01:00:00
    assert result.reference_candle_time == htf_1.time
    # Midpoint of htf_1: (110 + 90) / 2 = 100.0
    assert result.pivot_price == 100.0
    assert result.current_price == 107.0
    assert result.direction == "ABOVE"
    assert result.distance_points == 7.0
    assert result.is_confirmed is True
