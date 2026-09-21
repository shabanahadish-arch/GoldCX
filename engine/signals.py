"""
RiskPilot 8D - Signal Engine & Invalidation Protocol
Generates auditable, deterministic trading signals based on composite scores,
risk dimension alignment, zone context, and active blackout safety checks.
Signals strictly serve as decision-support insights with explicit disclaimers.
"""

from datetime import datetime, timezone
from decimal import Decimal
import hashlib
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from data.candle_builder import CandleRecord
from data.data_quality import QualityAssessment
from engine.dimension_orchestrator import FullRiskAnalysis


class SignalOutput(BaseModel):
    id: str
    signal_hash: str
    symbol: str
    timeframe: str
    timestamp: datetime
    direction: str  # LONG, SHORT, EXIT
    entry_reference: float
    stop_reference: float
    target_reference: float
    risk_reward_ratio: float
    composite_score: float
    confidence: float
    risk_level: str
    reasons: List[str]
    invalidation_condition: str
    data_quality_state: str
    disclaimer: str = (
        "RiskPilot 8D signals are quantitative research and decision-support calculations only. "
        "They do not constitute investment advice. Live trading is strictly disabled by default. "
        "Past statistical tendencies do not guarantee future performance."
    )


class SignalEngine:
    """
    Evaluates market conditions from FullRiskAnalysis and generates a trade signal
    only when strict multi-layered criteria are satisfied.
    """

    MIN_COMPOSITE_SCORE_THRESHOLD: float = 60.0
    MIN_CONFIDENCE_THRESHOLD: float = 60.0
    MIN_COVERAGE_THRESHOLD: float = 70.0
    MIN_RISK_REWARD_RATIO: float = 1.5

    @classmethod
    def generate_signal_hash(
        cls, symbol: str, timeframe: str, timestamp: datetime, direction: str, entry: float
    ) -> str:
        payload = f"{symbol}:{timeframe}:{timestamp.isoformat()}:{direction}:{entry:.4f}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @classmethod
    def evaluate(
        cls,
        analysis: FullRiskAnalysis,
        candles: List[CandleRecord],
        quality: Optional[QualityAssessment] = None,
        require_htf_alignment: bool = True,
        tick_size: float = 0.05,
        target_rr_multiple: float = 2.0,
    ) -> Optional[SignalOutput]:
        if not candles or not analysis or not analysis.composite_score:
            return None

        comp = analysis.composite_score
        curr_candle = candles[-1]
        c_price = float(curr_candle.close)
        ts = curr_candle.time

        # Safety Gate 1: Data Quality Check
        if quality and not quality.is_valid_for_signals:
            return None

        # Safety Gate 2: Action must be LONG_BIAS or SHORT_BIAS (BLOCKED or WAIT are rejected)
        if comp.action not in ("LONG_BIAS", "SHORT_BIAS"):
            return None

        # Safety Gate 3: Coverage and Confidence Thresholds
        if comp.coverage < cls.MIN_COVERAGE_THRESHOLD:
            return None
        if comp.confidence < cls.MIN_CONFIDENCE_THRESHOLD:
            return None

        # Safety Gate 4: High Sudden Movement Risk blocks entry
        sudden_dim = next((d for d in analysis.dimensions if d.code == "SUDDEN_MOVEMENT"), None)
        if sudden_dim and sudden_dim.risk_level == "HIGH":
            return None

        # Safety Gate 5: Active Event Blackout blocks entry
        event_dim = next((d for d in analysis.dimensions if d.code == "EVENT_RISK"), None)
        if event_dim and event_dim.feature_values.get("is_in_blackout", False):
            return None

        # Safety Gate 6: Adaptive Zone Context Guard
        # Never trigger LONG in Zone 7 (exhaustion) or SHORT in Zone 1 (deep discount)
        zones = analysis.adaptive_zones
        if zones:
            if comp.action == "LONG_BIAS" and zones.current_zone_index >= (zones.num_zones - 1):
                return None
            if comp.action == "SHORT_BIAS" and zones.current_zone_index <= 0:
                return None

        # Safety Gate 7: Higher Timeframe Alignment Check
        htf = analysis.htf_pivot
        if require_htf_alignment and htf:
            if comp.action == "LONG_BIAS" and htf.direction == "BELOW":
                return None
            if comp.action == "SHORT_BIAS" and htf.direction == "ABOVE":
                return None

        # Compute Reference Levels (Entry, Stop Loss, Target)
        # Stop loss anchored below recent swing low (for LONG) or above swing high (for SHORT)
        recent_bars = candles[-15:]
        recent_low = min(float(b.low) for b in recent_bars)
        recent_high = max(float(b.high) for b in recent_bars)

        reasons: List[str] = []

        if comp.action == "LONG_BIAS":
            direction = "LONG"
            entry_ref = c_price
            # Buffer stop by 2 ticks below swing low
            stop_ref = round(recent_low - (tick_size * 4), 2)
            stop_dist = max(entry_ref - stop_ref, tick_size * 5)
            target_dist = stop_dist * target_rr_multiple
            target_ref = round(entry_ref + target_dist, 2)
            rr_ratio = target_dist / stop_dist

            reasons.append(f"Composite score is {comp.weighted_score:+.1f} (Bullish state)")
            reasons.append(f"Confidence {comp.confidence:.0f}% with {comp.coverage:.0f}% dimension coverage")
            if zones:
                reasons.append(f"Adaptive zone is {zones.current_zone_label} (favorable valuation)")
            if htf:
                reasons.append(f"Price is trading {htf.direction} {htf.htf_timeframe} pivot ({htf.pivot_price:.2f})")

            invalidation = (
                f"Close below stop level {stop_ref:.2f}, "
                f"composite score dropping below +20, or sudden movement volatility spike."
            )

        else:
            direction = "SHORT"
            entry_ref = c_price
            # Buffer stop by 2 ticks above swing high
            stop_ref = round(recent_high + (tick_size * 4), 2)
            stop_dist = max(stop_ref - entry_ref, tick_size * 5)
            target_dist = stop_dist * target_rr_multiple
            target_ref = round(entry_ref - target_dist, 2)
            rr_ratio = target_dist / stop_dist

            reasons.append(f"Composite score is {comp.weighted_score:+.1f} (Bearish state)")
            reasons.append(f"Confidence {comp.confidence:.0f}% with {comp.coverage:.0f}% dimension coverage")
            if zones:
                reasons.append(f"Adaptive zone is {zones.current_zone_label} (favorable premium)")
            if htf:
                reasons.append(f"Price is trading {htf.direction} {htf.htf_timeframe} pivot ({htf.pivot_price:.2f})")

            invalidation = (
                f"Close above stop level {stop_ref:.2f}, "
                f"composite score rising above -20, or sudden movement volatility spike."
            )

        if rr_ratio < cls.MIN_RISK_REWARD_RATIO:
            return None

        sig_hash = cls.generate_signal_hash(analysis.symbol, analysis.timeframe, ts, direction, entry_ref)
        sig_id = f"SIG-{analysis.symbol}-{int(ts.timestamp())}"

        quality_state = quality.status if quality else "OPTIMAL"

        return SignalOutput(
            id=sig_id,
            signal_hash=sig_hash,
            symbol=analysis.symbol,
            timeframe=analysis.timeframe,
            timestamp=ts,
            direction=direction,
            entry_reference=round(entry_ref, 2),
            stop_reference=round(stop_ref, 2),
            target_reference=round(target_ref, 2),
            risk_reward_ratio=round(rr_ratio, 2),
            composite_score=comp.weighted_score,
            confidence=comp.confidence,
            risk_level=comp.risk_level,
            reasons=reasons,
            invalidation_condition=invalidation,
            data_quality_state=quality_state,
        )
