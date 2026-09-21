"""
Unit Tests for Remaining Risk Dimensions and the Master Orchestrator
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest

from data.candle_builder import CandleRecord
from engine.zone_location import ZoneLocationEngine
from engine.time_regime import TimeRegimeEngine
from engine.conditional_conf import ConditionalConfirmationEngine
from engine.event_risk import EventRiskEngine, ScheduledEvent
from engine.family_context import FamilyContextEngine
from engine.dimension_orchestrator import DimensionOrchestrator


def create_candles(count: int = 60, slope: float = 0.5) -> list[CandleRecord]:
    base_ts = 1704099600 # 2024-01-01 09:00:00 UTC
    candles: list[CandleRecord] = []
    p = 500.0
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
                volume=Decimal("2000"),
                is_complete=True,
            )
        )
    return candles


def test_zone_location_engine():
    candles = create_candles(50)
    d1 = ZoneLocationEngine.evaluate("TEST", "5m", candles)

    assert d1.dimension_id == 1
    assert d1.code == "ZONE_LOCATION"
    assert d1.is_available is True
    assert -1.0 <= d1.normalized_score <= 1.0


def test_time_regime_opening_vs_afternoon():
    # 09:20 IST -> Opening auction volatility (HIGH risk)
    # 09:20 IST is 03:50 UTC
    t_open_utc = datetime(2024, 1, 1, 3, 50, 0, tzinfo=timezone.utc)
    d2_open = TimeRegimeEngine.evaluate("TEST", t_open_utc, session_timezone="Asia/Kolkata")
    assert d2_open.risk_level == "HIGH"
    assert d2_open.feature_values["session_phase"] == "OPENING_VOLATILITY"

    # 14:00 IST -> Afternoon trend (LOW risk)
    # 14:00 IST is 08:30 UTC
    t_afternoon_utc = datetime(2024, 1, 1, 8, 30, 0, tzinfo=timezone.utc)
    d2_afternoon = TimeRegimeEngine.evaluate("TEST", t_afternoon_utc, session_timezone="Asia/Kolkata")
    assert d2_afternoon.risk_level == "LOW"
    assert d2_afternoon.feature_values["session_phase"] == "AFTERNOON_TREND"


def test_event_risk_blackout_trigger():
    now_utc = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    # High impact event 10 minutes away -> inside 20m blackout window!
    ev = ScheduledEvent(
        id="EV-1",
        title="RBI Interest Rate Decision",
        event_type="RBI_POLICY",
        event_time_utc=now_utc + timedelta(minutes=10),
        impact="HIGH",
        blackout_pre_minutes=20,
        blackout_post_minutes=15,
    )

    d7 = EventRiskEngine.evaluate("TEST", now_utc, scheduled_events=[ev])
    assert d7.risk_level == "HIGH"
    assert d7.feature_values["is_in_blackout"] is True
    assert any("EVENT BLACKOUT ACTIVE" in w for w in d7.warnings)


def test_family_context_vix_high():
    now_utc = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    d8 = FamilyContextEngine.evaluate("TEST", now_utc, vix_value=25.5)
    assert d8.risk_level == "HIGH"
    assert d8.feature_values["vix_risk_tier"] == "HIGH"


def test_full_dimension_orchestrator_all_8_dimensions():
    candles = create_candles(60, slope=0.3)
    analysis = DimensionOrchestrator.analyze(
        symbol="NIFTY",
        timeframe="5m",
        candles=candles,
        vix_value=14.0,
    )

    assert analysis.symbol == "NIFTY"
    assert len(analysis.dimensions) == 8
    # Ensure all 8 dimensions are distinct
    dim_ids = [d.dimension_id for d in analysis.dimensions]
    assert dim_ids == [1, 2, 3, 4, 5, 6, 7, 8]

    # Verify composite score generated
    assert analysis.composite_score is not None
    assert -100.0 <= analysis.composite_score.weighted_score <= 100.0
    assert analysis.composite_score.coverage > 60.0
    assert analysis.composite_score.action in ("LONG_BIAS", "SHORT_BIAS", "WAIT", "BLOCKED")
