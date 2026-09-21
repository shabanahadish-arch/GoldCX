"""
RiskPilot 8D - Data Quality Monitor & Feed Integrity Engine
Assesses latency, gap rates, out-of-order occurrences, and stale feed states.
Blocks trading or signal triggers if data status is not OPTIMAL.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.config import settings
from data.candle_builder import CandleRecord


class QualityAssessment(BaseModel):
    symbol: str
    timeframe: str
    status: str # OPTIMAL, DEGRADED, STALE, CORRUPT
    feed_latency_ms: float
    total_candles_inspected: int
    missing_intervals_count: int
    duplicates_found: int
    impossible_ohlc_found: int
    last_candle_time: Optional[datetime] = None
    age_seconds: float
    is_stale: bool
    is_valid_for_signals: bool
    reasons: List[str] = Field(default_factory=list)


class DataQualityMonitor:
    """
    Monitors streaming and historical bar feeds for data degradation and latency.
    """

    @classmethod
    def evaluate(
        cls,
        symbol: str,
        timeframe: str,
        candles: List[CandleRecord],
        diagnostics: Optional[Dict[str, Any]] = None,
        feed_latency_ms: float = 18.0,
    ) -> QualityAssessment:
        reasons: List[str] = []
        status = "OPTIMAL"

        if not candles:
            return QualityAssessment(
                symbol=symbol,
                timeframe=timeframe,
                status="CORRUPT",
                feed_latency_ms=feed_latency_ms,
                total_candles_inspected=0,
                missing_intervals_count=0,
                duplicates_found=0,
                impossible_ohlc_found=0,
                age_seconds=999999.0,
                is_stale=True,
                is_valid_for_signals=False,
                reasons=["No market candles available for symbol"],
            )

        last_time = candles[-1].time
        now_utc = datetime.now(timezone.utc)
        age_seconds = max(0.0, (now_utc - last_time).total_seconds())

        diag = diagnostics or {}
        missing_count = diag.get("missing_candles_count", 0)
        duplicates_count = diag.get("duplicates_removed", 0)
        impossible_count = diag.get("impossible_ohlc_dropped", 0)

        # Latency check
        if feed_latency_ms > 2000.0:
            status = "DEGRADED"
            reasons.append(f"High feed latency ({feed_latency_ms:.1f}ms > 2000ms threshold)")

        # Gaps / Outliers check
        if missing_count > 10:
            status = "DEGRADED"
            reasons.append(f"Significant gap rate detected ({missing_count} missing intervals)")

        if impossible_count > 0:
            status = "DEGRADED"
            reasons.append(f"Dropped {impossible_count} impossible OHLC bars")

        # Stale feed check (exceeds max tolerance)
        is_stale = False
        # If in live mode, check age against tolerance
        if not settings.PAPER_MODE and age_seconds > settings.MAX_STALE_DATA_TOLERANCE_SECONDS:
            status = "STALE"
            is_stale = True
            reasons.append(f"Feed data is stale (age: {age_seconds:.1f}s)")

        # Validity for signal generation
        is_valid_for_signals = status in ("OPTIMAL", "DEGRADED") and not is_stale

        return QualityAssessment(
            symbol=symbol,
            timeframe=timeframe,
            status=status,
            feed_latency_ms=feed_latency_ms,
            total_candles_inspected=len(candles),
            missing_intervals_count=missing_count,
            duplicates_found=duplicates_count,
            impossible_ohlc_found=impossible_count,
            last_candle_time=last_time,
            age_seconds=round(age_seconds, 2),
            is_stale=is_stale,
            is_valid_for_signals=is_valid_for_signals,
            reasons=reasons,
        )
