"""
RiskPilot 8D - Quantitative Analysis & Signals API Routes
Provides 8-dimensional risk matrix, adaptive zones, pivots, and decision-support signals.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from backend.market_store import market_store
from engine.dimension_orchestrator import DimensionOrchestrator
from engine.signals import SignalEngine

router = APIRouter(prefix="/api/v1/analysis", tags=["Risk Analysis & Signals"])


@router.get("/risk")
async def get_risk_analysis(
    symbol: str = Query("NIFTY", description="Asset symbol"),
    timeframe: str = Query("5m", description="Bar timeframe e.g. 5m, 15m, 1h"),
    higher_timeframe: str = Query("1h", description="Higher timeframe for HTF alignment"),
) -> Dict[str, Any]:
    """
    Computes full 8-dimensional risk matrix, adaptive zones, and composite score.
    """
    candles = market_store.get_candles(symbol, timeframe=timeframe, limit=120)
    htf_candles = market_store.get_candles(symbol, timeframe=higher_timeframe, limit=60)

    if len(candles) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient candles for {symbol} on {timeframe} (minimum 30 required, got {len(candles)})",
        )

    analysis = DimensionOrchestrator.analyze(
        symbol=symbol.upper(),
        timeframe=timeframe,
        candles=candles,
        higher_tf_candles=htf_candles,
    )

    return {
        "symbol": analysis.symbol,
        "timeframe": analysis.timeframe,
        "timestamp": analysis.timestamp.isoformat(),
        "dimensions": [
            {
                "dimension_index": d.dimension_index,
                "dimension_name": d.dimension_name,
                "raw_score": d.raw_score,
                "normalized_score": d.normalized_score,
                "confidence": d.confidence,
                "direction": d.direction,
                "risk_level": d.risk_level,
                "explanation": d.explanation,
                "metrics": d.metrics,
            }
            for d in analysis.dimensions
        ],
        "composite_score": {
            "weighted_score": analysis.composite_score.weighted_score,
            "confidence_score": analysis.composite_score.confidence_score,
            "coverage_score": analysis.composite_score.coverage_score,
            "direction": analysis.composite_score.direction,
            "risk_level": analysis.composite_score.risk_level,
            "action_recommendation": analysis.composite_score.action_recommendation,
            "invalidation_criteria": analysis.composite_score.invalidation_criteria,
            "warnings": analysis.composite_score.warnings,
            "summary_explanation": analysis.composite_score.summary_explanation,
        },
        "adaptive_zones": {
            "zone_id": analysis.adaptive_zones.zone_id,
            "zone_name": analysis.adaptive_zones.zone_name,
            "bias": analysis.adaptive_zones.bias,
            "action": analysis.adaptive_zones.action,
            "exhaustion_risk": analysis.adaptive_zones.exhaustion_risk,
            "zone_levels": analysis.adaptive_zones.zone_levels,
        },
        "pivot_levels": {
            "midpoint": {
                "pivot": analysis.pivot_levels.midpoint.pivot,
                "r1": analysis.pivot_levels.midpoint.r1,
                "r2": analysis.pivot_levels.midpoint.r2,
                "s1": analysis.pivot_levels.midpoint.s1,
                "s2": analysis.pivot_levels.midpoint.s2,
            },
            "camarilla": {
                "pivot": analysis.pivot_levels.camarilla.pivot,
                "h3": analysis.pivot_levels.camarilla.h3,
                "h4": analysis.pivot_levels.camarilla.h4,
                "l3": analysis.pivot_levels.camarilla.l3,
                "l4": analysis.pivot_levels.camarilla.l4,
            },
            "classical": {
                "pivot": analysis.pivot_levels.classical.pivot,
                "r1": analysis.pivot_levels.classical.r1,
                "s1": analysis.pivot_levels.classical.s1,
            },
        },
    }


@router.get("/signals")
async def get_signals(
    symbol: str = Query("NIFTY", description="Asset symbol"),
    timeframe: str = Query("5m", description="Bar timeframe"),
    higher_timeframe: str = Query("1h", description="Higher timeframe for HTF alignment"),
    require_htf_alignment: bool = Query(False, description="Require strict higher-timeframe confluence"),
) -> Dict[str, Any]:
    """
    Evaluates 7-gate safety checklist and generates decision-support signals.
    """
    candles = market_store.get_candles(symbol, timeframe=timeframe, limit=120)
    htf_candles = market_store.get_candles(symbol, timeframe=higher_timeframe, limit=60)

    if len(candles) < 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient candles for {symbol} on {timeframe}",
        )

    analysis = DimensionOrchestrator.analyze(
        symbol=symbol.upper(),
        timeframe=timeframe,
        candles=candles,
        higher_tf_candles=htf_candles,
    )

    signal = SignalEngine.evaluate(
        analysis=analysis,
        candles=candles,
        require_htf_alignment=require_htf_alignment,
    )

    if not signal:
        return {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "has_signal": False,
            "message": "No setup currently passes all 7 safety gates. Waiting for high-confluence alignment.",
            "composite_score": analysis.composite_score.weighted_score,
            "action_recommendation": analysis.composite_score.action_recommendation,
        }

    return {
        "symbol": signal.symbol,
        "timeframe": signal.timeframe,
        "has_signal": True,
        "signal_hash": signal.signal_hash,
        "timestamp": signal.timestamp.isoformat(),
        "direction": signal.direction,
        "entry_reference": signal.entry_reference,
        "stop_reference": signal.stop_reference,
        "target_reference": signal.target_reference,
        "risk_reward_ratio": signal.risk_reward_ratio,
        "composite_score": signal.composite_score,
        "confidence": signal.confidence,
        "risk_level": signal.risk_level,
        "reasons": signal.reasons,
        "invalidation_condition": signal.invalidation_condition,
        "data_quality_state": signal.data_quality_state,
    }
