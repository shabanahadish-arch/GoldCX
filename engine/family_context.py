"""
RiskPilot 8D - Dimension 8: Market / Family Context Risk
Quantifies benchmark index correlation, sector relative strength,
and broad volatility sentiment (India VIX / CBOE VIX).
"""

from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

from data.candle_builder import CandleRecord
from engine.dimension_contract import DimensionOutput


class FamilyContextEngine:
    """
    Evaluates broader market regime:
    1. Benchmark index trend (e.g., NIFTY 50 / SPY)
    2. Volatility index regime (VIX < 15: Low, 15-22: Normal, > 22: High fear)
    3. Sector relative strength
    """

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        current_time_utc: datetime,
        benchmark_candles: Optional[List[CandleRecord]] = None,
        vix_value: Optional[float] = 14.5,
        sector_trend_bias: float = 0.0, # [-1.0, +1.0]
    ) -> DimensionOutput:
        warnings: List[str] = []

        # 1. Benchmark trend alignment
        benchmark_score = 0.0
        if benchmark_candles and len(benchmark_candles) >= 5:
            b_close_now = float(benchmark_candles[-1].close)
            b_close_prev = float(benchmark_candles[-5].close)
            b_return_pct = ((b_close_now - b_close_prev) / b_close_prev) * 100.0
            benchmark_score = float(np.clip(b_return_pct / 0.8, -1.0, 1.0))
        else:
            warnings.append("Direct benchmark index feed offline; running on default market baseline.")

        # 2. VIX Volatility Regime
        vix = vix_value if vix_value is not None else 15.0
        if vix > 22.0:
            vix_risk = "HIGH"
            warnings.append(f"VIX elevated at {vix:.1f} (high market-wide volatility regime)")
        elif vix > 17.0:
            vix_risk = "MEDIUM"
        else:
            vix_risk = "LOW"

        # 3. Composite Family Context Score in [-1.0, +1.0]
        # Blends benchmark direction (60%) and sector relative strength (40%)
        normalized_score = float(np.clip(0.6 * benchmark_score + 0.4 * sector_trend_bias, -1.0, 1.0))

        if normalized_score >= 0.25:
            direction = "BULLISH"
        elif normalized_score <= -0.25:
            direction = "BEARISH"
        else:
            direction = "NEUTRAL"

        # Overall risk level
        if vix_risk == "HIGH":
            risk_level = "HIGH"
        elif vix_risk == "MEDIUM" or abs(normalized_score) < 0.15:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        confidence = 0.80 if benchmark_candles else 0.60

        explanation = (
            f"Market family context score: {normalized_score:+.2f} ({direction}). "
            f"Benchmark slope: {benchmark_score:+.2f}, Sector bias: {sector_trend_bias:+.2f}, "
            f"VIX: {vix:.1f} ({vix_risk} risk regime)."
        )

        return DimensionOutput(
            dimension_id=8,
            name="Market / Family Context Risk",
            code="FAMILY_CONTEXT",
            raw_value=round(vix, 2),
            normalized_score=round(normalized_score, 4),
            direction=direction,
            risk_level=risk_level,
            confidence=confidence,
            explanation=explanation,
            data_timestamp=current_time_utc,
            feature_values={
                "benchmark_score": round(benchmark_score, 3),
                "sector_trend_bias": round(sector_trend_bias, 3),
                "vix_value": round(vix, 2),
                "vix_risk_tier": vix_risk,
            },
            warnings=warnings,
            is_available=True,
        )
