"""
RiskPilot 8D - Dimension 2: Time Regime & Session Risk
Assesses intraday session phases, opening/closing auction hazards,
lunchtime liquidity thins, and day-of-week settlement volatility.
"""

from datetime import datetime, time, timezone
from typing import Dict, List, Optional
import zoneinfo

from engine.dimension_contract import DimensionOutput


class TimeRegimeEngine:
    """
    Classifies market timing regimes across session phases.
    Escalates execution risk during market opening (09:15-09:45 IST / 09:30-10:00 EST)
    and market closing (15:00-15:30 IST / 15:30-16:00 EST) auctions.
    """

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        current_time_utc: datetime,
        session_timezone: str = "Asia/Kolkata", # Default to Indian market hours, adaptable to US/UTC
    ) -> DimensionOutput:
        try:
            tz = zoneinfo.ZoneInfo(session_timezone)
        except Exception:
            tz = timezone.utc

        local_dt = current_time_utc.astimezone(tz)
        local_time = local_dt.time()
        weekday = local_dt.weekday() # 0 = Monday, 4 = Friday, 5/6 = Weekend

        warnings: List[str] = []

        # Check Weekend
        if weekday >= 5:
            return DimensionOutput(
                dimension_id=2,
                name="Time Regime & Session Risk",
                code="TIME_REGIME",
                raw_value=0.0,
                normalized_score=0.0,
                direction="NEUTRAL",
                risk_level="HIGH",
                confidence=0.95,
                explanation="Market session closed: Weekend period.",
                data_timestamp=current_time_utc,
                feature_values={"session_phase": "WEEKEND_CLOSED", "weekday": weekday},
                warnings=["Market is closed for the weekend."],
                is_available=True,
            )

        # Standard Indian Market Hours (09:15 to 15:30)
        # Phase definitions:
        # 09:15 - 09:45: OPENING_AUCTION_VOLATILITY (HIGH risk, initial price discovery)
        # 09:45 - 11:30: MORNING_MOMENTUM (LOW/MEDIUM risk, highest directional liquidity)
        # 11:30 - 13:30: MIDDAY_CONSOLIDATION / LUNCH (LOW liquidity, false breakouts)
        # 13:30 - 15:00: AFTERNOON_TREND (MEDIUM risk, institutional flow)
        # 15:00 - 15:30: CLOSING_AUCTION_SETTLEMENT (HIGH risk, intraday square-off)
        # Outside: CLOSED

        t_open = time(9, 15)
        t_open_end = time(9, 45)
        t_lunch_start = time(11, 30)
        t_lunch_end = time(13, 30)
        t_close_start = time(15, 0)
        t_close = time(15, 30)

        if local_time < t_open or local_time > t_close:
            session_phase = "AFTER_HOURS"
            risk_level = "HIGH"
            norm_score = 0.0
            direction = "NEUTRAL"
            warnings.append("Outside regular market trading session.")
        elif t_open <= local_time < t_open_end:
            session_phase = "OPENING_VOLATILITY"
            risk_level = "HIGH"
            norm_score = 0.0
            direction = "NEUTRAL"
            warnings.append("Opening auction volatility: high spread and false-break risk during first 30 mins.")
        elif t_open_end <= local_time < t_lunch_start:
            session_phase = "MORNING_MOMENTUM"
            risk_level = "LOW"
            norm_score = 0.20 # Favorable liquidity regime
            direction = "NEUTRAL"
        elif t_lunch_start <= local_time < t_lunch_end:
            session_phase = "MIDDAY_CHOP"
            risk_level = "MEDIUM"
            norm_score = -0.10 # Mean-reverting chop hazard
            direction = "NEUTRAL"
            warnings.append("Midday liquidity lull: prone to range contraction and false break whipsaws.")
        elif t_lunch_end <= local_time < t_close_start:
            session_phase = "AFTERNOON_TREND"
            risk_level = "LOW"
            norm_score = 0.15 # Institutional follow-through
            direction = "NEUTRAL"
        else:
            session_phase = "CLOSING_SETTLEMENT"
            risk_level = "HIGH"
            norm_score = 0.0
            direction = "NEUTRAL"
            warnings.append("Closing intraday square-off window: erratic execution and slippage hazard.")

        if weekday == 4 and local_time >= time(14, 30):
            warnings.append("Friday weekend square-off pressure.")

        confidence = 0.90

        explanation = (
            f"Time regime: {session_phase} ({local_dt.strftime('%H:%M %Z')}, Day {weekday}). "
            f"Execution risk level: {risk_level}."
        )

        return DimensionOutput(
            dimension_id=2,
            name="Time Regime & Session Risk",
            code="TIME_REGIME",
            raw_value=round(norm_score, 4),
            normalized_score=round(norm_score, 4),
            direction=direction,
            risk_level=risk_level,
            confidence=confidence,
            explanation=explanation,
            data_timestamp=current_time_utc,
            feature_values={
                "session_phase": session_phase,
                "local_time": local_dt.strftime("%H:%M:%S"),
                "session_timezone": session_timezone,
                "weekday": weekday,
            },
            warnings=warnings,
            is_available=True,
        )
