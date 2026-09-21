"""
RiskPilot 8D - Adaptive Zones Engine
Calculates N adaptive rolling high-low zones across configurable lookback periods.
Provides transparent boundary metrics, zone index, distance to boundaries,
and breakout states without proprietary black-box calculations.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from data.candle_builder import CandleRecord


class ZoneBoundary(BaseModel):
    zone_index: int
    label: str
    lower_price: float
    upper_price: float
    is_current: bool


class AdaptiveZonesResult(BaseModel):
    symbol: str
    timeframe: str
    timestamp: datetime
    lookback_bars: int
    rolling_high: float
    rolling_low: float
    range_span: float
    num_zones: int
    current_zone_index: int
    current_zone_label: str
    normalized_location: float  # [0.0, 1.0] or outside if breakout
    distance_to_upper: float
    distance_to_lower: float
    breakout_status: str  # IN_RANGE, BREAKOUT_ABOVE, BREAKOUT_BELOW
    zones: List[ZoneBoundary]
    explanation: str


class AdaptiveZonesEngine:
    """
    Computes rolling adaptive price zones based on recent empirical high/low range.
    Default N = 7 partitions.
    """

    ZONE_LABELS_7 = [
        "Zone 1 (Deep Value / Oversold)",
        "Zone 2 (Discount Range)",
        "Zone 3 (Lower Neutral)",
        "Zone 4 (Equilibrium / Mean)",
        "Zone 5 (Upper Neutral)",
        "Zone 6 (Premium Range)",
        "Zone 7 (Premium Exhaustion)",
    ]

    @classmethod
    def calculate(
        cls,
        symbol: str,
        timeframe: str,
        candles: List[CandleRecord],
        lookback_bars: int = 50,
        num_zones: int = 7,
        minimum_tick_size: float = 0.05,
    ) -> Optional[AdaptiveZonesResult]:
        if not candles or len(candles) < 5:
            return None

        recent_bars = candles[-lookback_bars:]
        rolling_high = max(float(b.high) for b in recent_bars)
        rolling_low = min(float(b.low) for b in recent_bars)
        
        range_span = max(rolling_high - rolling_low, minimum_tick_size)
        current_close = float(candles[-1].close)
        latest_ts = candles[-1].time

        # Calculate N partitions
        step = range_span / num_zones
        boundaries: List[float] = [rolling_low + step * k for k in range(num_zones + 1)]

        # Determine current zone index
        if current_close > rolling_high:
            current_zone_index = num_zones - 1
            breakout_status = "BREAKOUT_ABOVE"
        elif current_close < rolling_low:
            current_zone_index = 0
            breakout_status = "BREAKOUT_BELOW"
        else:
            current_zone_index = min(int((current_close - rolling_low) / step), num_zones - 1)
            breakout_status = "IN_RANGE"

        normalized_loc = (current_close - rolling_low) / range_span

        lower_bound = boundaries[current_zone_index]
        upper_bound = boundaries[current_zone_index + 1]

        distance_to_upper = max(0.0, upper_bound - current_close)
        distance_to_lower = max(0.0, current_close - lower_bound)

        zone_objects: List[ZoneBoundary] = []
        for i in range(num_zones):
            label = (
                cls.ZONE_LABELS_7[i]
                if num_zones == 7 and i < len(cls.ZONE_LABELS_7)
                else f"Zone {i + 1}"
            )
            is_curr = i == current_zone_index
            zone_objects.append(
                ZoneBoundary(
                    zone_index=i,
                    label=label,
                    lower_price=round(boundaries[i], 4),
                    upper_price=round(boundaries[i + 1], 4),
                    is_current=is_curr,
                )
            )

        current_label = zone_objects[current_zone_index].label

        explanation = (
            f"Price {current_close:.2f} is located in {current_label} "
            f"({normalized_loc * 100:.1f}% of {lookback_bars}-bar range). "
            f"Dist to upper boundary: {distance_to_upper:.2f}, to lower: {distance_to_lower:.2f}. "
            f"State: {breakout_status}."
        )

        return AdaptiveZonesResult(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=latest_ts,
            lookback_bars=len(recent_bars),
            rolling_high=round(rolling_high, 4),
            rolling_low=round(rolling_low, 4),
            range_span=round(range_span, 4),
            num_zones=num_zones,
            current_zone_index=current_zone_index,
            current_zone_label=current_label,
            normalized_location=round(normalized_loc, 4),
            distance_to_upper=round(distance_to_upper, 4),
            distance_to_lower=round(distance_to_lower, 4),
            breakout_status=breakout_status,
            zones=zone_objects,
            explanation=explanation,
        )
