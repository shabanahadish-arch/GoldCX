"""
RiskPilot 8D - Dimension 4: Price Action Perception Risk
Calculates candle body-to-range ratios, Close Location Value (CLV), wick rejections,
gap displacements, and momentum direction into a normalized [-1.0, +1.0] metric.
"""

from datetime import datetime
from typing import List, Optional
import numpy as np

from data.candle_builder import CandleRecord
from engine.dimension_contract import DimensionOutput


class PriceActionEngine:
    """
    Analyzes candlestick morphology, rejection wicks, close location within range,
    and intra-bar order flow perception.
    """

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        candles: List[CandleRecord],
        lookback_bars: int = 14,
        pivot_price: Optional[float] = None,
    ) -> DimensionOutput:
        if not candles or len(candles) < 2:
            ts = candles[-1].time if candles else datetime.utcnow()
            return DimensionOutput.unavailable(
                dimension_id=4,
                name="Price Action Perception Risk",
                code="PRICE_ACTION",
                timestamp=ts,
                reason="At least 2 completed bars required for price action perception analysis",
            )

        curr = candles[-1]
        prev = candles[-2]
        ts = curr.time

        o = float(curr.open)
        h = float(curr.high)
        l = float(curr.low)
        c = float(curr.close)
        prev_c = float(prev.close)

        bar_range = max(h - l, 0.0001)
        body = abs(c - o)
        body_range_ratio = body / bar_range

        # 1. Close Location Value (CLV): ranges from -1.0 (closed at low) to +1.0 (closed at high)
        clv = ((c - l) - (h - c)) / bar_range

        # 2. Upper and Lower Wick Ratios
        upper_wick = (h - max(o, c)) / bar_range
        lower_wick = (min(o, c) - l) / bar_range

        # 3. Gap Analysis
        gap = o - prev_c
        gap_pct = (gap / prev_c) * 100.0 if prev_c > 0 else 0.0

        # 4. Multi-bar momentum displacement (last 5 bars)
        recent_bars = candles[-min(5, len(candles)):]
        net_displacement = (float(recent_bars[-1].close) - float(recent_bars[0].open))
        avg_range = sum(float(b.high) - float(b.low) for b in recent_bars) / len(recent_bars)
        displacement_ratio = np.clip(net_displacement / max(avg_range * 2.0, 0.001), -1.0, 1.0)

        # 5. Rejection Detection
        warnings: List[str] = []
        is_bullish_rejection = lower_wick > 0.50 and clv > 0.20
        is_bearish_rejection = upper_wick > 0.50 and clv < -0.20

        if is_bullish_rejection:
            warnings.append("Bullish wick absorption detected (strong buyers defending low)")
        elif is_bearish_rejection:
            warnings.append("Bearish wick rejection detected (strong sellers defending high)")

        # Composite Price Action Score in [-1.0, +1.0]
        # Weighted: CLV (45%), 5-bar displacement (35%), Rejection wicks (20%)
        rejection_factor = (lower_wick - upper_wick)
        normalized_score = float(0.45 * clv + 0.35 * displacement_ratio + 0.20 * rejection_factor)
        normalized_score = float(np.clip(normalized_score, -1.0, 1.0))

        if normalized_score >= 0.25:
            direction = "BULLISH"
        elif normalized_score <= -0.25:
            direction = "BEARISH"
        else:
            direction = "NEUTRAL"

        # Risk Level: Indecision doji or conflicting signals increase perception risk
        if body_range_ratio < 0.15:
            risk_level = "HIGH"
            warnings.append("High indecision doji bar: body is less than 15% of total bar range")
        elif (clv > 0.5 and direction == "BEARISH") or (clv < -0.5 and direction == "BULLISH"):
            risk_level = "MEDIUM"
            warnings.append("Price action intra-bar divergence against intermediate bias")
        else:
            risk_level = "LOW"

        confidence = 0.80

        explanation = (
            f"Price action score {normalized_score:+.2f} ({direction}). "
            f"CLV: {clv:+.2f}, Body/Range: {body_range_ratio:.2f}, "
            f"Upper Wick: {upper_wick:.2f}, Lower Wick: {lower_wick:.2f}, "
            f"Gap: {gap_pct:+.2f}%."
        )

        return DimensionOutput(
            dimension_id=4,
            name="Price Action Perception Risk",
            code="PRICE_ACTION",
            raw_value=round(clv, 4),
            normalized_score=round(normalized_score, 4),
            direction=direction,
            risk_level=risk_level,
            confidence=confidence,
            explanation=explanation,
            data_timestamp=ts,
            feature_values={
                "clv": round(clv, 3),
                "body_range_ratio": round(body_range_ratio, 3),
                "upper_wick_ratio": round(upper_wick, 3),
                "lower_wick_ratio": round(lower_wick, 3),
                "gap_pct": round(gap_pct, 3),
                "displacement_ratio": round(float(displacement_ratio), 3),
                "is_bullish_rejection": is_bullish_rejection,
                "is_bearish_rejection": is_bearish_rejection,
            },
            warnings=warnings,
            is_available=True,
        )
