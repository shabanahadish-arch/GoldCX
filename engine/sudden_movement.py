"""
RiskPilot 8D - Dimension 5: Sudden Movement Risk
Detects ATR volatility expansions, volume surges, abnormal range percentiles,
and gap discontinuities that escalate slippage and market execution hazard.
"""

from datetime import datetime
from typing import List, Optional
import numpy as np

from data.candle_builder import CandleRecord
from engine.dimension_contract import DimensionOutput


class SuddenMovementEngine:
    """
    Evaluates sudden volatility spikes, abnormal bar expansions, and volume surges.
    Elevates risk level to HIGH regardless of direction when variance spikes excessively.
    """

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        candles: List[CandleRecord],
        lookback_bars: int = 20,
        atr_span: int = 14,
    ) -> DimensionOutput:
        if not candles or len(candles) < max(lookback_bars, atr_span) + 1:
            ts = candles[-1].time if candles else datetime.utcnow()
            return DimensionOutput.unavailable(
                dimension_id=5,
                name="Sudden Movement Risk",
                code="SUDDEN_MOVEMENT",
                timestamp=ts,
                reason=f"Requires at least {max(lookback_bars, atr_span) + 1} candles for volatility baseline",
            )

        curr = candles[-1]
        ts = curr.time

        # 1. Compute True Range for each bar
        # TR = max(high - low, abs(high - prev_close), abs(low - prev_close))
        true_ranges: List[float] = []
        for i in range(1, len(candles)):
            c = candles[i]
            prev_c = float(candles[i - 1].close)
            h = float(c.high)
            l = float(c.low)
            tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
            true_ranges.append(tr)

        # Rolling ATR over previous bars (excluding current bar to avoid self-referential bias)
        recent_trs = true_ranges[-(atr_span + 1):-1]
        baseline_atr = sum(recent_trs) / len(recent_trs) if recent_trs else 1.0
        current_tr = true_ranges[-1]

        # ATR Expansion Multiple
        atr_expansion = current_tr / max(baseline_atr, 0.0001)

        # 2. Volume Spike Ratio
        volumes = [float(c.volume) for c in candles]
        baseline_vol = sum(volumes[-(lookback_bars + 1):-1]) / lookback_bars if lookback_bars > 0 else 1.0
        current_vol = volumes[-1]
        volume_spike = current_vol / max(baseline_vol, 1.0)

        # 3. Range Percentile over lookback
        lookback_trs = true_ranges[-lookback_bars:]
        percentile_rank = (sum(1 for r in lookback_trs if r <= current_tr) / len(lookback_trs)) * 100.0

        # 4. Directional Impulse (Direction of the sudden movement)
        curr_return = (float(curr.close) - float(curr.open)) / max(float(curr.open), 0.001)
        if curr_return > 0.002:
            direction = "BULLISH"
            norm_direction = 1.0
        elif curr_return < -0.002:
            direction = "BEARISH"
            norm_direction = -1.0
        else:
            direction = "NEUTRAL"
            norm_direction = 0.0

        # 5. Normalized Sudden Movement Severity Score in [-1.0, 1.0]
        # Directional sign with magnitude proportional to ATR expansion
        severity = min((atr_expansion - 1.0) / 2.0, 1.0) if atr_expansion > 1.0 else 0.0
        normalized_score = float(np.clip(norm_direction * severity, -1.0, 1.0))

        # Risk Level Assessment
        # Severe sudden movement is inherently risky due to slippage, spread blowout, and mean reversion
        warnings: List[str] = []
        if atr_expansion >= 2.5 or volume_spike >= 3.0:
            risk_level = "HIGH"
            warnings.append(
                f"Extreme sudden movement alert: Range is {atr_expansion:.2f}x ATR and Volume is {volume_spike:.2f}x average"
            )
        elif atr_expansion >= 1.7 or volume_spike >= 2.0:
            risk_level = "MEDIUM"
            warnings.append(f"Elevated volatility surge: Range expansion {atr_expansion:.2f}x ATR")
        else:
            risk_level = "LOW"

        confidence = 0.85

        explanation = (
            f"Sudden movement: {atr_expansion:.2f}x ATR expansion, "
            f"{volume_spike:.2f}x volume spike ({percentile_rank:.0f}th percentile). "
            f"Directional impulse: {direction}. Risk level: {risk_level}."
        )

        return DimensionOutput(
            dimension_id=5,
            name="Sudden Movement Risk",
            code="SUDDEN_MOVEMENT",
            raw_value=round(atr_expansion, 4),
            normalized_score=round(normalized_score, 4),
            direction=direction,
            risk_level=risk_level,
            confidence=confidence,
            explanation=explanation,
            data_timestamp=ts,
            feature_values={
                "atr_expansion": round(atr_expansion, 2),
                "volume_spike": round(volume_spike, 2),
                "percentile_rank": round(percentile_rank, 1),
                "current_tr": round(current_tr, 3),
                "baseline_atr": round(baseline_atr, 3),
            },
            warnings=warnings,
            is_available=True,
        )
