"""
RiskPilot 8D - Composite Score & Coverage Engine
Synthesizes eight orthogonal risk dimensions using confidence-weighted aggregation.
Computes coverage percentages, directional biases, risk tiers, and action states.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from engine.dimension_contract import DimensionOutput


class CompositeResult(BaseModel):
    symbol: str
    timeframe: str
    timestamp: datetime
    weighted_score: float = Field(..., ge=-100.0, le=100.0)
    confidence: float = Field(..., ge=0.0, le=100.0)
    coverage: float = Field(..., ge=0.0, le=100.0)
    direction: str  # BULLISH, BEARISH, NEUTRAL, UNAVAILABLE
    risk_level: str  # LOW, MEDIUM, HIGH, UNAVAILABLE
    action: str  # LONG_BIAS, SHORT_BIAS, WAIT, BLOCKED
    invalidation_criteria: str
    warnings: List[str] = Field(default_factory=list)
    summary_explanation: str
    dimension_scores: Dict[str, float] = Field(default_factory=dict)
    weights_used: Dict[str, float] = Field(default_factory=dict)


class CompositeScoreEngine:
    """
    Combines available risk dimensions into a unified score with transparent weights.
    Never assumes 0 for missing dimensions; strictly discounts coverage.
    """

    DEFAULT_WEIGHTS: Dict[str, float] = {
        "ZONE_LOCATION": 1.25,
        "TIME_REGIME": 1.00,
        "TREND_HEALTH": 1.50,
        "PRICE_ACTION": 1.25,
        "SUDDEN_MOVEMENT": 1.00,
        "CONDITIONAL_CONF": 1.00,
        "EVENT_RISK": 1.25,
        "FAMILY_CONTEXT": 1.00,
    }

    @classmethod
    def calculate(
        cls,
        symbol: str,
        timeframe: str,
        dimensions: List[DimensionOutput],
        custom_weights: Optional[Dict[str, float]] = None,
        data_is_valid: bool = True,
        active_event_blackout: bool = False,
    ) -> CompositeResult:
        weights = custom_weights or cls.DEFAULT_WEIGHTS
        timestamp = dimensions[0].data_timestamp if dimensions else datetime.now(timezone.utc)

        all_configured_weight_sum = sum(weights.values())

        available_dims = [d for d in dimensions if d.is_available and d.direction != "UNAVAILABLE"]

        # Aggregate weighted score and available coverage
        weighted_score_sum = 0.0
        weighted_conf_sum = 0.0
        coverage_num = 0.0
        dim_scores_map: Dict[str, float] = {}
        warnings: List[str] = []

        for d in dimensions:
            w = weights.get(d.code, 1.0)
            if d.is_available and d.direction != "UNAVAILABLE":
                # Normalized score is in [-1.0, 1.0], scaled to [-100, 100]
                scaled_score = d.normalized_score * 100.0
                dim_scores_map[d.code] = round(scaled_score, 1)

                weighted_score_sum += w * scaled_score * d.confidence
                weighted_conf_sum += w * d.confidence
                coverage_num += w * d.confidence
            else:
                dim_scores_map[d.code] = 0.0
                warnings.append(f"Dimension {d.code} missing or unavailable; discounted coverage.")

        # Compute coverage percentage
        coverage_pct = (coverage_num / max(all_configured_weight_sum, 0.001)) * 100.0
        coverage_pct = min(100.0, max(0.0, coverage_pct))

        # Compute composite weighted score
        if weighted_conf_sum > 0:
            final_score = weighted_score_sum / weighted_conf_sum
            avg_confidence = (weighted_conf_sum / sum(weights.get(d.code, 1.0) for d in available_dims)) * 100.0
        else:
            final_score = 0.0
            avg_confidence = 0.0

        final_score = min(100.0, max(-100.0, final_score))
        avg_confidence = min(100.0, max(0.0, avg_confidence))

        # Overall risk level: highest risk level among available dimensions
        if any(d.risk_level == "HIGH" for d in available_dims):
            overall_risk = "HIGH"
        elif any(d.risk_level == "MEDIUM" for d in available_dims):
            overall_risk = "MEDIUM"
        elif available_dims:
            overall_risk = "LOW"
        else:
            overall_risk = "UNAVAILABLE"

        # Directional classification
        if final_score >= 30.0:
            direction = "BULLISH"
        elif final_score <= -30.0:
            direction = "BEARISH"
        else:
            direction = "NEUTRAL"

        # Action Recommendation Logic
        # Default policy:
        # LONG_BIAS: score >= 60, confidence >= 60, coverage >= 70, risk != HIGH
        # SHORT_BIAS: score <= -60, confidence >= 60, coverage >= 70, risk != HIGH
        # BLOCKED: data invalid, active blackout, or coverage < 40
        # WAIT: otherwise
        if not data_is_valid:
            action = "BLOCKED"
            warnings.append("Action BLOCKED: Data quality assessment is invalid or stale.")
        elif active_event_blackout:
            action = "BLOCKED"
            warnings.append("Action BLOCKED: Scheduled event blackout window active.")
        elif coverage_pct < 40.0:
            action = "BLOCKED"
            warnings.append(f"Action BLOCKED: Insufficient risk dimension coverage ({coverage_pct:.1f}% < 40%).")
        elif final_score >= 60.0 and avg_confidence >= 60.0 and coverage_pct >= 70.0 and overall_risk != "HIGH":
            action = "LONG_BIAS"
        elif final_score <= -60.0 and avg_confidence >= 60.0 and coverage_pct >= 70.0 and overall_risk != "HIGH":
            action = "SHORT_BIAS"
        else:
            action = "WAIT"

        # Invalidation Criteria
        if action == "LONG_BIAS":
            invalidation = (
                f"Invalidated if composite score crosses below +20, "
                f"coverage drops below 60%, or sudden movement risk triggers HIGH."
            )
        elif action == "SHORT_BIAS":
            invalidation = (
                f"Invalidated if composite score crosses above -20, "
                f"coverage drops below 60%, or sudden movement risk triggers HIGH."
            )
        else:
            invalidation = "Wait mode: requires alignment across >= 70% dimension coverage without HIGH risk spikes."

        summary_explanation = (
            f"RiskPilot 8D composite score: {final_score:+.1f}/100 ({direction}). "
            f"Confidence: {avg_confidence:.1f}%, Coverage: {coverage_pct:.1f}%, "
            f"Risk: {overall_risk}. Action recommendation: {action}."
        )

        return CompositeResult(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=timestamp,
            weighted_score=round(final_score, 2),
            confidence=round(avg_confidence, 2),
            coverage=round(coverage_pct, 2),
            direction=direction,
            risk_level=overall_risk,
            action=action,
            invalidation_criteria=invalidation,
            warnings=warnings,
            summary_explanation=summary_explanation,
            dimension_scores=dim_scores_map,
            weights_used=weights,
        )
