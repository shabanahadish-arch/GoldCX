"""
RiskPilot 8D - Dimension 1: Zone Location Risk
Quantifies location within empirical price boundaries, mean-reversion stretch,
and boundary exhaustion into a normalized [-1.0, +1.0] risk score.
"""

from datetime import datetime
from typing import List, Optional
import numpy as np

from data.candle_builder import CandleRecord
from engine.adaptive_zones import AdaptiveZonesEngine, AdaptiveZonesResult
from engine.dimension_contract import DimensionOutput


class ZoneLocationEngine:
    """
    Evaluates where current price sits within the adaptive range.
    Deep discount zones yield positive (bullish mean reversion) scores with low valuation risk,
    while extreme boundary breakouts trigger exhaustion warnings.
    """

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        timeframe: str,
        candles: List[CandleRecord],
        zones_result: Optional[AdaptiveZonesResult] = None,
        lookback_bars: int = 50,
    ) -> DimensionOutput:
        if not candles or len(candles) < 5:
            ts = candles[-1].time if candles else datetime.utcnow()
            return DimensionOutput.unavailable(
                dimension_id=1,
                name="Zone Location Risk",
                code="ZONE_LOCATION",
                timestamp=ts,
                reason="Insufficient candles for adaptive zone evaluation",
            )

        ts = candles[-1].time
        if zones_result is None:
            zones_result = AdaptiveZonesEngine.calculate(
                symbol=symbol,
                timeframe=timeframe,
                candles=candles,
                lookback_bars=lookback_bars,
            )

        if not zones_result:
            return DimensionOutput.unavailable(
                dimension_id=1,
                name="Zone Location Risk",
                code="ZONE_LOCATION",
                timestamp=ts,
                reason="Failed to compute adaptive zones",
            )

        loc = zones_result.normalized_location  # 0.0 (low) to 1.0 (high)
        # Mean reversion directional potential:
        # Lower zones (0.0 to 0.3) provide bullish upside value -> positive score (+0.3 to +1.0)
        # Upper zones (0.7 to 1.0) provide bearish exhaustion risk -> negative score (-0.3 to -1.0)
        # Equilibrium (0.3 to 0.7) -> near 0.0
        # Centered around 0.5:
        norm_score = float(np.clip((0.5 - loc) * 2.0, -1.0, 1.0))

        if norm_score >= 0.25:
            direction = "BULLISH"
        elif norm_score <= -0.25:
            direction = "BEARISH"
        else:
            direction = "NEUTRAL"

        # Risk level: extreme boundaries or breakouts elevate zone location risk
        warnings: List[str] = []
        if zones_result.breakout_status == "BREAKOUT_ABOVE":
            risk_level = "HIGH"
            warnings.append(f"Price trading above maximum {lookback_bars}-bar range (breakout exhaustion risk)")
        elif zones_result.breakout_status == "BREAKOUT_BELOW":
            risk_level = "HIGH"
            warnings.append(f"Price trading below minimum {lookback_bars}-bar range (breakdown continuation risk)")
        elif loc > 0.85 or loc < 0.15:
            risk_level = "MEDIUM"
            warnings.append(f"Price in boundary territory ({zones_result.current_zone_label})")
        else:
            risk_level = "LOW"

        confidence = 0.85

        explanation = (
            f"Zone location score {norm_score:+.2f} ({direction}). "
            f"Price is in {zones_result.current_zone_label} ({loc * 100:.1f}% of range). "
            f"Upper dist: {zones_result.distance_to_upper:.2f}, Lower dist: {zones_result.distance_to_lower:.2f}."
        )

        return DimensionOutput(
            dimension_id=1,
            name="Zone Location Risk",
            code="ZONE_LOCATION",
            raw_value=round(loc, 4),
            normalized_score=round(norm_score, 4),
            direction=direction,
            risk_level=risk_level,
            confidence=confidence,
            explanation=explanation,
            data_timestamp=ts,
            feature_values={
                "current_zone_index": zones_result.current_zone_index,
                "zone_label": zones_result.current_zone_label,
                "normalized_location": round(loc, 3),
                "distance_to_upper": zones_result.distance_to_upper,
                "distance_to_lower": zones_result.distance_to_lower,
                "breakout_status": zones_result.breakout_status,
                "rolling_high": zones_result.rolling_high,
                "rolling_low": zones_result.rolling_low,
            },
            warnings=warnings,
            is_available=True,
        )
