"""
RiskPilot 8D - Standard Risk Dimension Score Contract
Typed output schema enforced across all eight risk dimensions.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DimensionOutput(BaseModel):
    dimension_id: int
    name: str
    code: str
    raw_value: Optional[float] = None
    normalized_score: float = Field(..., ge=-1.0, le=1.0)
    direction: str  # BULLISH, BEARISH, NEUTRAL, UNAVAILABLE
    risk_level: str  # LOW, MEDIUM, HIGH, UNAVAILABLE
    confidence: float = Field(..., ge=0.0, le=1.0)
    explanation: str
    data_timestamp: datetime
    feature_values: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    is_available: bool = True

    @classmethod
    def unavailable(
        cls,
        dimension_id: int,
        name: str,
        code: str,
        timestamp: datetime,
        reason: str,
    ) -> "DimensionOutput":
        """Factory for unavailable dimension state without defaulting to false neutrality."""
        return cls(
            dimension_id=dimension_id,
            name=name,
            code=code,
            raw_value=None,
            normalized_score=0.0,
            direction="UNAVAILABLE",
            risk_level="UNAVAILABLE",
            confidence=0.0,
            explanation=f"Dimension data unavailable: {reason}",
            data_timestamp=timestamp,
            feature_values={"status": "missing_data"},
            warnings=[f"Missing required data feeds for {code}: {reason}"],
            is_available=False,
        )
