"""
RiskPilot 8D - Dimension 3: Trend Health Risk
Quantifies trend strength, EMA slope, VWAP displacement, moving average alignment,
and structural higher-highs/lower-lows into a transparent [-1.0, +1.0] score.
"""

from datetime import datetime
from typing import List, Optional
import numpy as np

from data.candle_builder import CandleRecord
from engine.dimension_contract import DimensionOutput


class TrendHealthEngine:
    """
    Evaluates market trend persistence, alignment across moving averages,
    and institutional price location relative to VWAP.
    """

    @staticmethod
    def _calculate_ema(values: List[float], span: int) -> List[float]:
        alpha = 2.0 / (span + 1.0)
        ema = [values[0]]
        for v in values[1:]:
            ema.append(alpha * v + (1.0 - alpha) * ema[-1])
        return ema

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        candles: List[CandleRecord],
        ema_fast_span: int = 9,
        ema_mid_span: int = 21,
        ema_slow_span: int = 50,
    ) -> DimensionOutput:
        if not candles or len(candles) < ema_slow_span:
            ts = candles[-1].time if candles else datetime.utcnow()
            return DimensionOutput.unavailable(
                dimension_id=3,
                name="Trend Health Risk",
                code="TREND_HEALTH",
                timestamp=ts,
                reason=f"Insufficient candle history (minimum {ema_slow_span} bars needed, got {len(candles)})",
            )

        closes = [float(c.close) for c in candles]
        highs = [float(c.high) for c in candles]
        lows = [float(c.low) for c in candles]
        volumes = [float(c.volume) for c in candles]
        current_candle = candles[-1]
        ts = current_candle.time

        # 1. EMAs and Slope
        ema9 = cls._calculate_ema(closes, ema_fast_span)
        ema21 = cls._calculate_ema(closes, ema_mid_span)
        ema50 = cls._calculate_ema(closes, ema_slow_span)

        c_now = closes[-1]
        e9_now, e21_now, e50_now = ema9[-1], ema21[-1], ema50[-1]
        e21_prev = ema21[-3] if len(ema21) >= 3 else ema21[0]
        ema21_slope_pct = ((e21_now - e21_prev) / e21_prev) * 100.0

        # 2. Moving Average Alignment
        # Bullish stack: 9 > 21 > 50; Bearish stack: 9 < 21 < 50
        if e9_now > e21_now > e50_now:
            ma_alignment = 1.0
        elif e9_now < e21_now < e50_now:
            ma_alignment = -1.0
        else:
            ma_alignment = 0.0

        # 3. Anchored / Rolling VWAP
        # VWAP = sum(typical_price * volume) / sum(volume) over last 50 bars
        recent_bars = candles[-50:]
        vwap_num = sum(((float(b.high) + float(b.low) + float(b.close)) / 3.0) * float(b.volume) for b in recent_bars)
        vwap_den = sum(float(b.volume) for b in recent_bars)
        vwap = vwap_num / max(vwap_den, 1.0)
        vwap_diff_pct = ((c_now - vwap) / vwap) * 100.0

        # 4. Market Structure: Higher Highs & Higher Lows over last 15 bars
        last_15 = candles[-15:]
        local_highs = [float(b.high) for b in last_15]
        local_lows = [float(b.low) for b in last_15]
        first_half_high = max(local_highs[:7])
        second_half_high = max(local_highs[7:])
        first_half_low = min(local_lows[:7])
        second_half_low = min(local_lows[7:])

        structure_bias = 0.0
        if second_half_high > first_half_high and second_half_low > first_half_low:
            structure_bias = 0.8 # Higher Highs + Higher Lows
        elif second_half_high < first_half_high and second_half_low < first_half_low:
            structure_bias = -0.8 # Lower Highs + Lower Lows

        # 5. Composite Normalized Score in [-1.0, +1.0]
        # Weighted blend of MA alignment (35%), EMA slope (25%), VWAP location (25%), Structure (15%)
        slope_score = np.clip(ema21_slope_pct / 0.5, -1.0, 1.0)
        vwap_score = np.clip(vwap_diff_pct / 1.0, -1.0, 1.0)

        normalized_score = float(
            0.35 * ma_alignment +
            0.25 * slope_score +
            0.25 * vwap_score +
            0.15 * structure_bias
        )
        normalized_score = float(np.clip(normalized_score, -1.0, 1.0))

        # Direction determination
        if normalized_score >= 0.30:
            direction = "BULLISH"
        elif normalized_score <= -0.30:
            direction = "BEARISH"
        else:
            direction = "NEUTRAL"

        # Risk level: Extreme extension or severe divergence increases risk
        extension_from_50 = abs(c_now - e50_now) / e50_now * 100.0
        warnings: List[str] = []
        if extension_from_50 > 3.5:
            risk_level = "HIGH"
            warnings.append(f"Trend severely extended {extension_from_50:.1f}% away from 50 EMA (mean reversion risk)")
        elif abs(normalized_score) < 0.20:
            risk_level = "MEDIUM"
            warnings.append("Choppy / unaligned trend structure across moving averages")
        else:
            risk_level = "LOW"

        confidence = 0.85 if len(candles) >= 100 else 0.70

        explanation = (
            f"Trend health score is {normalized_score:+.2f} ({direction}). "
            f"MA Alignment: {ma_alignment:+.1f}, EMA21 Slope: {ema21_slope_pct:+.2f}%, "
            f"Price vs VWAP: {vwap_diff_pct:+.2f}%, Structure: {structure_bias:+.1f}."
        )

        return DimensionOutput(
            dimension_id=3,
            name="Trend Health Risk",
            code="TREND_HEALTH",
            raw_value=round(ema21_slope_pct, 4),
            normalized_score=round(normalized_score, 4),
            direction=direction,
            risk_level=risk_level,
            confidence=confidence,
            explanation=explanation,
            data_timestamp=ts,
            feature_values={
                "ema9": round(e9_now, 2),
                "ema21": round(e21_now, 2),
                "ema50": round(e50_now, 2),
                "ema21_slope_pct": round(ema21_slope_pct, 3),
                "vwap": round(vwap, 2),
                "vwap_diff_pct": round(vwap_diff_pct, 3),
                "ma_alignment": ma_alignment,
                "structure_bias": structure_bias,
            },
            warnings=warnings,
            is_available=True,
        )
