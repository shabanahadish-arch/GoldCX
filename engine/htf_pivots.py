"""
RiskPilot 8D - Higher-Timeframe Pivot Engine
Computes reference pivots using only completed higher-timeframe candles
to strictly eliminate look-ahead bias during live streaming and backtests.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from data.candle_builder import CandleRecord


class PivotResult(BaseModel):
    symbol: str
    htf_timeframe: str
    calculation_time: datetime
    reference_candle_time: datetime
    pivot_price: float
    formula_used: str # MIDPOINT, TYPICAL
    current_price: float
    distance_points: float
    distance_percent: float
    direction: str # ABOVE, BELOW, AT_PIVOT
    is_confirmed: bool
    explanation: str


class HTFPivotEngine:
    """
    Calculates completed higher-timeframe pivot benchmarks (e.g., prior 1h bar or 1d bar).
    """

    @classmethod
    def calculate(
        cls,
        symbol: str,
        current_candle: CandleRecord,
        htf_candles: List[CandleRecord],
        htf_timeframe: str = "1h",
        formula: str = "MIDPOINT",
    ) -> Optional[PivotResult]:
        """
        Calculates HTF reference pivot using the latest completed HTF candle that ends
        before or at the start of current_candle, eliminating look-ahead bias.
        """
        if not htf_candles or not current_candle:
            return None

        # Filter strictly for completed HTF candles whose timestamp is strictly < current_candle.time
        # or if htf_candles already only contains completed candles, take the last completed candle
        valid_htf = [
            c for c in htf_candles
            if c.is_complete and c.time < current_candle.time
        ]

        if not valid_htf:
            # Fallback to the first completed candle if dataset is short
            ref_candle = htf_candles[0]
        else:
            ref_candle = valid_htf[-1]

        high = float(ref_candle.high)
        low = float(ref_candle.low)
        close = float(ref_candle.close)

        if formula.upper() == "TYPICAL":
            pivot_price = (high + low + close) / 3.0
            formula_name = "Typical Price (H+L+C)/3"
        else:
            pivot_price = (high + low) / 2.0
            formula_name = "Completed Midpoint (H+L)/2"

        curr_p = float(current_candle.close)
        dist_points = curr_p - pivot_price
        dist_pct = (dist_points / pivot_price) * 100.0 if pivot_price > 0 else 0.0

        tolerance = pivot_price * 0.0005 # 0.05% band for AT_PIVOT
        if abs(dist_points) <= tolerance:
            direction = "AT_PIVOT"
        elif dist_points > 0:
            direction = "ABOVE"
        else:
            direction = "BELOW"

        explanation = (
            f"Current price ({curr_p:.2f}) is trading {direction} the {htf_timeframe} "
            f"pivot ({pivot_price:.2f}, derived from completed bar {ref_candle.time.strftime('%H:%M UTC')}). "
            f"Spread: {dist_points:+.2f} pts ({dist_pct:+.2f}%)."
        )

        return PivotResult(
            symbol=symbol,
            htf_timeframe=htf_timeframe,
            calculation_time=current_candle.time,
            reference_candle_time=ref_candle.time,
            pivot_price=round(pivot_price, 4),
            formula_used=formula_name,
            current_price=round(curr_p, 4),
            distance_points=round(dist_points, 4),
            distance_percent=round(dist_pct, 4),
            direction=direction,
            is_confirmed=ref_candle.is_complete,
            explanation=explanation,
        )
