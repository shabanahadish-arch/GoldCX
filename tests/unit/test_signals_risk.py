"""
Unit Tests for Signal Engine and Risk Management Calculator
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest

from data.candle_builder import CandleRecord
from engine.dimension_orchestrator import DimensionOrchestrator
from engine.signals import SignalEngine, SignalOutput
from engine.risk_calculator import RiskCalculator, RiskCalculatorInput


def create_candles(count: int = 60, start_price: float = 500.0, slope: float = 0.5) -> list[CandleRecord]:
    base_ts = 1704099600
    candles: list[CandleRecord] = []
    p = start_price
    for i in range(count):
        p += slope
        dt = datetime.fromtimestamp(base_ts + i * 300, tz=timezone.utc)
        candles.append(
            CandleRecord(
                time=dt,
                open=Decimal(str(round(p - 0.2, 2))),
                high=Decimal(str(round(p + 0.4, 2))),
                low=Decimal(str(round(p - 0.3, 2))),
                close=Decimal(str(round(p + 0.2, 2))),
                volume=Decimal("2500"),
                is_complete=True,
            )
        )
    return candles


def test_risk_calculator_lot_sizing_and_breakeven():
    # Account: 500,000 INR
    # Risk: 1% = 5,000 INR
    # Entry: 21,500, Stop: 21,450 (stop distance = 50 pts)
    # Target: 21,625 (target distance = 125 pts, R:R = 2.5)
    # Lot Size: 50 (e.g. NIFTY 50), Value per point: 1.0
    # Risk per contract: 50 pts * 1.0 = 50 INR
    # Max units allowed: 5,000 / 50 = 100 units
    # Lots: 100 / 50 = 2 lots (100 quantity)
    calc_input = RiskCalculatorInput(
        equity=500000.0,
        risk_percentage=1.0,
        entry_price=21500.0,
        stop_price=21450.0,
        target_price=21625.0,
        tick_size=0.05,
        lot_size=50,
        value_per_point=1.0,
        brokerage_per_order=20.0,
    )

    out = RiskCalculator.calculate(calc_input)

    assert out.is_valid is True
    assert out.max_risk_amount == 5000.0
    assert out.stop_distance == 50.0
    assert out.target_distance == 125.0
    assert out.risk_reward_ratio == 2.5
    assert out.lots == 2
    assert out.executable_quantity == 100
    assert out.actual_risk_amount == 5000.0
    assert out.potential_profit == 12500.0
    assert out.total_estimated_friction > 0.0
    # Breakeven for LONG must be above entry price to cover round-trip friction
    assert out.breakeven_price > 21500.0


def test_risk_calculator_insufficient_equity_for_lot():
    # Equity = 1,000, 1% risk = 10 INR, stop distance = 50 pts
    # 1 lot (50 units) requires 2,500 INR risk -> 0 lots executable
    calc_input = RiskCalculatorInput(
        equity=1000.0,
        risk_percentage=1.0,
        entry_price=500.0,
        stop_price=450.0,
        target_price=600.0,
        lot_size=50,
    )

    out = RiskCalculator.calculate(calc_input)
    assert out.lots == 0
    assert out.executable_quantity == 0
    assert out.is_valid is False
    assert any("too low" in w for w in out.warnings)


def test_signal_engine_blocks_on_sudden_movement():
    candles = create_candles(60, start_price=500.0, slope=0.6)
    analysis = DimensionOrchestrator.analyze("TEST", "5m", candles)

    # Force Sudden Movement to HIGH risk
    for d in analysis.dimensions:
        if d.code == "SUDDEN_MOVEMENT":
            d.risk_level = "HIGH"

    signal = SignalEngine.evaluate(analysis, candles)
    # High sudden movement must strictly block signal generation
    assert signal is None


def test_signal_engine_blocks_on_event_blackout():
    candles = create_candles(60, start_price=500.0, slope=0.6)
    analysis = DimensionOrchestrator.analyze("TEST", "5m", candles)

    # Force event blackout in Event Risk dimension
    for d in analysis.dimensions:
        if d.code == "EVENT_RISK":
            d.feature_values["is_in_blackout"] = True

    signal = SignalEngine.evaluate(analysis, candles)
    assert signal is None
