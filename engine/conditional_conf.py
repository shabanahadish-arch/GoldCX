"""
RiskPilot 8D - Dimension 6: Conditional Confirmation Risk
Evaluates multi-timeframe alignment, volume-price trend concordance,
and volume profile confirmation across multiple aggregations.
"""

from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

from data.candle_builder import CandleRecord
from engine.dimension_contract import DimensionOutput


class ConditionalConfirmationEngine:
    """
    Checks whether the primary timeframe's signal is validated by
    higher-timeframe trend alignment and volume participation.
    """

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        primary_candles: List[CandleRecord],
        htf_candles: Optional[List[CandleRecord]] = None,
        lookback_bars: int = 20,
    ) -> DimensionOutput:
        if not primary_candles or len(primary_candles) < 10:
            ts = primary_candles[-1].time if primary_candles else datetime.utcnow()
            return DimensionOutput.unavailable(
                dimension_id=6,
                name="Conditional Confirmation Risk",
                code="CONDITIONAL_CONF",
                timestamp=ts,
                reason="At least 10 primary candles required for conditional confirmation",
            )

        ts = primary_candles[-1].time
        recent_primary = primary_candles[-lookback_bars:]

        # 1. Volume Confirmation on Primary Timeframe
        # Bullish volume confirmation: Bullish bars have higher average volume than Bearish bars
        bull_volumes: List[float] = []
        bear_volumes: List[float] = []

        for c in recent_primary:
            o, cl, v = float(c.open), float(c.close), float(c.volume)
            if cl > o:
                bull_volumes.append(v)
            elif cl < o:
                bear_volumes.append(v)

        avg_bull_vol = sum(bull_volumes) / max(len(bull_volumes), 1)
        avg_bear_vol = sum(bear_volumes) / max(len(bear_volumes), 1)

        vol_ratio = (avg_bull_vol - avg_bear_vol) / max(avg_bull_vol + avg_bear_vol, 1.0)
        # vol_ratio ranges from -1.0 (bearish volume dominates) to +1.0 (bullish volume dominates)

        # 2. Multi-Timeframe Alignment
        htf_alignment = 0.0
        warnings: List[str] = []

        if htf_candles and len(htf_candles) >= 3:
            # Check slope / trend of higher timeframe
            htf_closes = [float(b.close) for b in htf_candles[-5:]]
            if htf_closes[-1] > htf_closes[0]:
                htf_alignment = 0.8
            elif htf_closes[-1] < htf_closes[0]:
                htf_alignment = -0.8
            else:
                htf_alignment = 0.0
        else:
            warnings.append("Higher-timeframe bars not provided; MTF confirmation running on single TF proxy.")

        # 3. Blended Confirmation Score
        if htf_candles:
            normalized_score = float(np.clip(0.5 * vol_ratio + 0.5 * htf_alignment, -1.0, 1.0))
            confidence = 0.85
        else:
            normalized_score = float(np.clip(vol_ratio, -1.0, 1.0))
            confidence = 0.65

        if normalized_score >= 0.25:
            direction = "BULLISH"
        elif normalized_score <= -0.25:
            direction = "BEARISH"
        else:
            direction = "NEUTRAL"

        # Risk level: Divergence between price direction and volume confirmation indicates exhaustion
        primary_slope = float(recent_primary[-1].close) - float(recent_primary[0].close)
        is_divergence = (primary_slope > 0 and vol_ratio < -0.3) or (primary_slope < 0 and vol_ratio > 0.3)

        if is_divergence:
            risk_level = "HIGH"
            warnings.append("Volume-Price divergence: price moving against dominant volume participation.")
        elif abs(normalized_score) < 0.2:
            risk_level = "MEDIUM"
            warnings.append("Lack of strong volume or higher-timeframe confirmation.")
        else:
            risk_level = "LOW"

        explanation = (
            f"Conditional confirmation score: {normalized_score:+.2f} ({direction}). "
            f"Volume flow ratio: {vol_ratio:+.2f}, HTF trend alignment: {htf_alignment:+.2f}. "
            f"Confirmation risk level: {risk_level}."
        )

        return DimensionOutput(
            dimension_id=6,
            name="Conditional Confirmation Risk",
            code="CONDITIONAL_CONF",
            raw_value=round(vol_ratio, 4),
            normalized_score=round(normalized_score, 4),
            direction=direction,
            risk_level=risk_level,
            confidence=confidence,
            explanation=explanation,
            data_timestamp=ts,
            feature_values={
                "vol_ratio": round(vol_ratio, 3),
                "avg_bull_vol": round(avg_bull_vol, 1),
                "avg_bear_vol": round(avg_bear_vol, 1),
                "htf_alignment": htf_alignment,
                "is_divergence": is_divergence,
            },
            warnings=warnings,
            is_available=True,
        )
