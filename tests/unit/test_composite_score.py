"""
Unit Tests for Risk Dimensions and Composite Score Engine
"""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from data.candle_builder import CandleRecord
from engine.dimension_contract import DimensionOutput
from engine.trend_health import TrendHealthEngine
from engine.price_action import PriceActionEngine
from engine.sudden_movement import SuddenMovementEngine
from engine.composite_score import CompositeScoreEngine


def create_bullish_candles(count: int = 60) -> list[CandleRecord]:
    base_ts = 1704067200
    candles: list[CandleRecord] = []
    price = 100.0
    for i in range(count):
        price += 0.5 + (0.1 if i % 2 == 0 else -0.05)
        dt = datetime.fromtimestamp(base_ts + i * 300, tz=timezone.utc)
        candles.append(
            CandleRecord(
                time=dt,
                open=Decimal(str(round(price - 0.2, 2))),
                high=Decimal(str(round(price + 0.4, 2))),
                low=Decimal(str(round(price - 0.3, 2))),
                close=Decimal(str(round(price + 0.2, 2))),
                volume=Decimal("1500"),
                is_complete=True,
            )
        )
    return candles


def test_trend_health_engine_bullish():
    candles = create_bullish_candles(60)
    dim = TrendHealthEngine.evaluate(symbol="TEST", candles=candles)

    assert dim.is_available is True
    assert dim.direction == "BULLISH"
    assert dim.normalized_score > 0.30
    assert dim.confidence > 0.60
    assert "TREND_HEALTH" in dim.code


def test_price_action_engine_clv():
    candles = create_bullish_candles(10)
    dim = PriceActionEngine.evaluate(symbol="TEST", candles=candles)

    assert dim.is_available is True
    assert -1.0 <= dim.normalized_score <= 1.0
    assert dim.direction in ("BULLISH", "BEARISH", "NEUTRAL")


def test_sudden_movement_normal_vs_spike():
    candles = create_bullish_candles(30)
    normal_dim = SuddenMovementEngine.evaluate(symbol="TEST", candles=candles)
    assert normal_dim.risk_level == "LOW"

    # Append an extreme volatility bar with 10x range and 5x volume
    last_dt = datetime.fromtimestamp(1704067200 + 30 * 300, tz=timezone.utc)
    spike_bar = CandleRecord(
        time=last_dt,
        open=Decimal("120.0"),
        high=Decimal("140.0"),
        low=Decimal("118.0"),
        close=Decimal("138.0"),
        volume=Decimal("15000"),
        is_complete=True,
    )
    candles.append(spike_bar)

    spike_dim = SuddenMovementEngine.evaluate(symbol="TEST", candles=candles)
    assert spike_dim.risk_level in ("MEDIUM", "HIGH")
    assert spike_dim.feature_values["atr_expansion"] > 1.5


def test_composite_score_synthesis_and_coverage():
    ts = datetime.now(timezone.utc)
    # 3 available dimensions, 5 missing
    dim1 = DimensionOutput(
        dimension_id=1,
        name="Zone Location",
        code="ZONE_LOCATION",
        normalized_score=0.8,
        direction="BULLISH",
        risk_level="LOW",
        confidence=0.9,
        explanation="Near lower boundary",
        data_timestamp=ts,
    )
    dim3 = DimensionOutput(
        dimension_id=3,
        name="Trend Health",
        code="TREND_HEALTH",
        normalized_score=0.7,
        direction="BULLISH",
        risk_level="LOW",
        confidence=0.85,
        explanation="Strong uptrend",
        data_timestamp=ts,
    )
    dim4 = DimensionOutput(
        dimension_id=4,
        name="Price Action",
        code="PRICE_ACTION",
        normalized_score=0.6,
        direction="BULLISH",
        risk_level="LOW",
        confidence=0.8,
        explanation="Bullish CLV",
        data_timestamp=ts,
    )
    unavailable_dim = DimensionOutput.unavailable(
        dimension_id=7,
        name="Event Risk",
        code="EVENT_RISK",
        timestamp=ts,
        reason="Calendar provider offline",
    )

    result = CompositeScoreEngine.calculate(
        symbol="TEST",
        timeframe="5m",
        dimensions=[dim1, dim3, dim4, unavailable_dim],
    )

    assert result.weighted_score > 50.0
    assert result.direction == "BULLISH"
    assert 0.0 < result.coverage < 100.0  # Discounted because of missing dimensions
    assert result.risk_level == "LOW"
