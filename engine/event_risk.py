"""
RiskPilot 8D - Dimension 7: Event & Macro Risk
Monitors scheduled macro releases, central bank decisions (RBI/Fed), earnings,
and policy events. Enforces mandatory pre/post event blackout windows.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from engine.dimension_contract import DimensionOutput


class ScheduledEvent(BaseModel):
    id: str
    title: str
    event_type: str  # RBI_POLICY, FED_RATE, CPI_INFLATION, NFP, EARNINGS, BUDGET
    event_time_utc: datetime
    impact: str  # HIGH, MEDIUM, LOW
    blackout_pre_minutes: int = 20
    blackout_post_minutes: int = 15


class EventRiskEngine:
    """
    Assesses event risk proximity. If the current bar timestamp is within
    the event blackout window, risk is elevated to HIGH and trading is gated.
    """

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        current_time_utc: datetime,
        scheduled_events: Optional[List[ScheduledEvent]] = None,
    ) -> DimensionOutput:
        if current_time_utc.tzinfo is None:
            current_time_utc = current_time_utc.replace(tzinfo=timezone.utc)

        events = scheduled_events or []
        warnings: List[str] = []

        is_in_blackout = False
        active_event: Optional[ScheduledEvent] = None
        min_minutes_to_event = 999999.0
        closest_event: Optional[ScheduledEvent] = None

        for ev in events:
            ev_time = ev.event_time_utc
            if ev_time.tzinfo is None:
                ev_time = ev_time.replace(tzinfo=timezone.utc)

            delta_sec = (ev_time - current_time_utc).total_seconds()
            delta_mins = delta_sec / 60.0

            if abs(delta_mins) < abs(min_minutes_to_event):
                min_minutes_to_event = delta_mins
                closest_event = ev

            # Check blackout window
            # delta_mins > 0 means event is in the future
            # -post_mins <= delta_mins <= pre_mins means we are inside the blackout window
            if -ev.blackout_post_minutes <= delta_mins <= ev.blackout_pre_minutes:
                is_in_blackout = True
                active_event = ev
                break

        if is_in_blackout and active_event:
            risk_level = "HIGH"
            norm_score = 0.0
            direction = "NEUTRAL"
            warnings.append(
                f"EVENT BLACKOUT ACTIVE: {active_event.title} ({active_event.event_type}, Impact: {active_event.impact}). "
                f"Window: -{active_event.blackout_pre_minutes}m to +{active_event.blackout_post_minutes}m."
            )
            explanation = (
                f"Event Risk is HIGH due to imminent or active release: {active_event.title}. "
                f"Directional setups are blocked during event volatility window."
            )
        elif closest_event and 0 < min_minutes_to_event <= 60:
            risk_level = "MEDIUM" if closest_event.impact in ("HIGH", "MEDIUM") else "LOW"
            norm_score = 0.0
            direction = "NEUTRAL"
            warnings.append(
                f"Upcoming {closest_event.impact} impact event: {closest_event.title} in {min_minutes_to_event:.0f} minutes."
            )
            explanation = f"Approaching {closest_event.title} in {min_minutes_to_event:.0f}m. Risk level: {risk_level}."
        else:
            risk_level = "LOW"
            norm_score = 0.0
            direction = "NEUTRAL"
            explanation = "No high-impact scheduled economic events or earnings blackouts within observation horizon."

        return DimensionOutput(
            dimension_id=7,
            name="Event & Macro Risk",
            code="EVENT_RISK",
            raw_value=round(min_minutes_to_event, 1) if closest_event else None,
            normalized_score=norm_score,
            direction=direction,
            risk_level=risk_level,
            confidence=0.95,
            explanation=explanation,
            data_timestamp=current_time_utc,
            feature_values={
                "is_in_blackout": is_in_blackout,
                "closest_event_title": closest_event.title if closest_event else None,
                "minutes_to_event": round(min_minutes_to_event, 1) if closest_event else None,
                "active_event_type": active_event.event_type if active_event else None,
            },
            warnings=warnings,
            is_available=True,
        )
