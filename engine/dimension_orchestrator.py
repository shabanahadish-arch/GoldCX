"""
RiskPilot 8D - 8-Dimension Orchestrator
Master pipeline executing all eight orthogonal risk dimension engines,
generating complete explanations, and computing the Composite Score State.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from data.candle_builder import CandleRecord
from engine.adaptive_zones import AdaptiveZonesEngine, AdaptiveZonesResult
from engine.htf_pivots import HTFPivotEngine, PivotResult
from engine.dimension_contract import DimensionOutput
from engine.zone_location import ZoneLocationEngine
from engine.time_regime import TimeRegimeEngine
from engine.trend_health import TrendHealthEngine
from engine.price_action import PriceActionEngine
from engine.sudden_movement import SuddenMovementEngine
from engine.conditional_conf import ConditionalConfirmationEngine
from engine.event_risk import EventRiskEngine, ScheduledEvent
from engine.family_context import FamilyContextEngine
from engine.composite_score import CompositeScoreEngine, CompositeResult


class FullRiskAnalysis(BaseModel):
    symbol: str
    timeframe: str
    timestamp: datetime
    adaptive_zones: Optional[AdaptiveZonesResult] = None
    htf_pivot: Optional[PivotResult] = None
    dimensions: List[DimensionOutput]
    composite_score: CompositeResult


class DimensionOrchestrator:
    """
    Executes all 8 dimension modules in deterministic, transparent sequence.
    """

    @classmethod
    def analyze(
        cls,
        symbol: str,
        timeframe: str,
        candles: List[CandleRecord],
        htf_candles: Optional[List[CandleRecord]] = None,
        benchmark_candles: Optional[List[CandleRecord]] = None,
        scheduled_events: Optional[List[ScheduledEvent]] = None,
        vix_value: Optional[float] = 14.5,
        session_timezone: str = "Asia/Kolkata",
        custom_weights: Optional[Dict[str, float]] = None,
        data_is_valid: bool = True,
    ) -> FullRiskAnalysis:
        if not candles:
            now_ts = datetime.now(timezone.utc)
            empty_dims = [
                DimensionOutput.unavailable(i, f"Dimension {i}", f"D{i}", now_ts, "No candles")
                for i in range(1, 9)
            ]
            composite = CompositeScoreEngine.calculate(
                symbol=symbol,
                timeframe=timeframe,
                dimensions=empty_dims,
                data_is_valid=False,
            )
            return FullRiskAnalysis(
                symbol=symbol,
                timeframe=timeframe,
                timestamp=now_ts,
                dimensions=empty_dims,
                composite_score=composite,
            )

        current_candle = candles[-1]
        ts = current_candle.time

        # 1. Adaptive Zones
        zones_res = AdaptiveZonesEngine.calculate(
            symbol=symbol,
            timeframe=timeframe,
            candles=candles,
            lookback_bars=50,
            num_zones=7,
        )

        # 2. HTF Pivot (Midpoint)
        htf_pivot_res = None
        if htf_candles:
            htf_pivot_res = HTFPivotEngine.calculate(
                symbol=symbol,
                current_candle=current_candle,
                htf_candles=htf_candles,
                htf_timeframe="1h",
                formula="MIDPOINT",
            )

        # 3. Compute All 8 Dimensions
        # D1: Zone Location
        d1 = ZoneLocationEngine.evaluate(
            symbol=symbol,
            timeframe=timeframe,
            candles=candles,
            zones_result=zones_res,
        )

        # D2: Time Regime
        d2 = TimeRegimeEngine.evaluate(
            symbol=symbol,
            current_time_utc=ts,
            session_timezone=session_timezone,
        )

        # D3: Trend Health
        d3 = TrendHealthEngine.evaluate(
            symbol=symbol,
            candles=candles,
        )

        # D4: Price Action Perception
        d4 = PriceActionEngine.evaluate(
            symbol=symbol,
            candles=candles,
            pivot_price=htf_pivot_res.pivot_price if htf_pivot_res else None,
        )

        # D5: Sudden Movement
        d5 = SuddenMovementEngine.evaluate(
            symbol=symbol,
            candles=candles,
        )

        # D6: Conditional Confirmation
        d6 = ConditionalConfirmationEngine.evaluate(
            symbol=symbol,
            primary_candles=candles,
            htf_candles=htf_candles,
        )

        # D7: Event Risk
        d7 = EventRiskEngine.evaluate(
            symbol=symbol,
            current_time_utc=ts,
            scheduled_events=scheduled_events,
        )

        # D8: Family Context
        d8 = FamilyContextEngine.evaluate(
            symbol=symbol,
            current_time_utc=ts,
            benchmark_candles=benchmark_candles,
            vix_value=vix_value,
        )

        all_dimensions = [d1, d2, d3, d4, d5, d6, d7, d8]

        # Check if event blackout is active in D7
        is_event_blackout = bool(d7.feature_values.get("is_in_blackout", False))

        # 4. Composite Score Synthesis
        composite_res = CompositeScoreEngine.calculate(
            symbol=symbol,
            timeframe=timeframe,
            dimensions=all_dimensions,
            custom_weights=custom_weights,
            data_is_valid=data_is_valid,
            active_event_blackout=is_event_blackout,
        )

        return FullRiskAnalysis(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=ts,
            adaptive_zones=zones_res,
            htf_pivot=htf_pivot_res,
            dimensions=all_dimensions,
            composite_score=composite_res,
        )
