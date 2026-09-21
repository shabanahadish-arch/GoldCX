"""
RiskPilot 8D - Risk Management & Position Sizing Calculator API
Calculates lot sizing, max allowable risk, round-trip frictions, and post-friction breakeven price.
"""

from typing import Any, Dict
from fastapi import APIRouter
from pydantic import BaseModel, Field

from engine.risk_calculator import RiskCalculator, RiskCalculatorInput

router = APIRouter(prefix="/api/v1/calculator", tags=["Risk Management Calculator"])


class PositionSizeRequest(BaseModel):
    equity: float = Field(500000.0, description="Trading account equity")
    risk_percentage: float = Field(1.0, description="Risk percentage of equity (e.g. 1.0 = 1%)")
    entry_price: float = Field(22100.0, description="Target entry price")
    stop_price: float = Field(22060.0, description="Planned stop loss price")
    target_price: float = Field(22200.0, description="Planned profit target price")
    tick_size: float = Field(0.05, description="Asset minimum tick increment")
    lot_size: int = Field(50, description="Exchange contract lot size")
    value_per_point: float = Field(1.0, description="Value per point move")
    brokerage_per_order: float = Field(20.0, description="Broker commission per order")
    exchange_fee_pct: float = Field(0.0035, description="Exchange turnover charge %")
    tax_pct: float = Field(0.018, description="STT and regulatory taxes %")
    slippage_ticks: int = Field(2, description="Expected bid-ask slippage in ticks")


@router.post("/position-size")
async def calculate_position_size(req: PositionSizeRequest) -> Dict[str, Any]:
    calc_input = RiskCalculatorInput(
        equity=req.equity,
        risk_percentage=req.risk_percentage,
        entry_price=req.entry_price,
        stop_price=req.stop_price,
        target_price=req.target_price,
        tick_size=req.tick_size,
        lot_size=req.lot_size,
        value_per_point=req.value_per_point,
        brokerage_per_order=req.brokerage_per_order,
        exchange_fee_pct=req.exchange_fee_pct,
        tax_pct=req.tax_pct,
        slippage_ticks=req.slippage_ticks,
    )

    res = RiskCalculator.calculate(calc_input)
    return {
        "is_valid": res.is_valid,
        "validation_error": res.validation_error,
        "max_allowable_risk": res.max_allowable_risk,
        "stop_distance_points": res.stop_distance_points,
        "stop_distance_pct": res.stop_distance_pct,
        "raw_units": res.raw_units,
        "lots": res.lots,
        "executable_quantity": res.executable_quantity,
        "actual_risk_amount": res.actual_risk_amount,
        "potential_profit": res.potential_profit,
        "effective_rr_ratio": res.effective_rr_ratio,
        "frictions": {
            "brokerage_round_trip": res.brokerage_round_trip,
            "exchange_and_taxes": res.exchange_and_taxes,
            "slippage_cost": res.slippage_cost,
            "total_estimated_friction": res.total_estimated_friction,
            "friction_per_unit": res.friction_per_unit,
        },
        "breakeven_price": res.breakeven_price,
    }
