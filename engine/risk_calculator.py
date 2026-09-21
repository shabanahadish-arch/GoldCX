"""
RiskPilot 8D - Risk Management & Position Sizing Calculator
Calculates position sizing based on strict account equity risk parameters,
lot size constraints, slippage buffers, exchange fees, and taxes.
"""

from decimal import Decimal
import math
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class RiskCalculatorInput(BaseModel):
    equity: float = Field(..., gt=0, description="Total account equity")
    risk_percentage: float = Field(1.0, ge=0.05, le=5.0, description="Risk % per trade")
    entry_price: float = Field(..., gt=0)
    stop_price: float = Field(..., gt=0)
    target_price: float = Field(..., gt=0)
    tick_size: float = Field(0.05, gt=0)
    lot_size: int = Field(1, ge=1)
    value_per_point: float = Field(1.0, gt=0)
    brokerage_per_order: float = Field(20.0, ge=0)
    exchange_fee_pct: float = Field(0.0035, ge=0)
    tax_pct: float = Field(0.018, ge=0)
    slippage_ticks: int = Field(2, ge=0)


class RiskCalculatorOutput(BaseModel):
    max_risk_amount: float
    stop_distance: float
    target_distance: float
    risk_reward_ratio: float
    raw_quantity: float
    lots: int
    executable_quantity: int
    actual_risk_amount: float
    potential_profit: float
    estimated_fees_and_taxes: float
    estimated_slippage_cost: float
    total_estimated_friction: float
    breakeven_price: float
    estimated_margin: float
    is_valid: bool
    warnings: List[str] = Field(default_factory=list)


class RiskCalculator:
    """
    Computes mathematical position sizing and friction calculations.
    Ensures risk strictly respects account preservation rules.
    """

    @classmethod
    def calculate(cls, params: RiskCalculatorInput) -> RiskCalculatorOutput:
        warnings: List[str] = []

        is_long = params.target_price > params.entry_price
        stop_distance = abs(params.entry_price - params.stop_price)
        target_distance = abs(params.target_price - params.entry_price)

        if stop_distance <= params.tick_size:
            return RiskCalculatorOutput(
                max_risk_amount=0.0,
                stop_distance=0.0,
                target_distance=0.0,
                risk_reward_ratio=0.0,
                raw_quantity=0.0,
                lots=0,
                executable_quantity=0,
                actual_risk_amount=0.0,
                potential_profit=0.0,
                estimated_fees_and_taxes=0.0,
                estimated_slippage_cost=0.0,
                total_estimated_friction=0.0,
                breakeven_price=params.entry_price,
                estimated_margin=0.0,
                is_valid=False,
                warnings=["Stop distance must be greater than minimum tick size."],
            )

        # 1. Allowed risk in currency
        max_risk_currency = params.equity * (params.risk_percentage / 100.0)

        # 2. Risk per point per contract/share
        risk_per_unit = stop_distance * params.value_per_point

        # 3. Position Sizing
        raw_units = max_risk_currency / risk_per_unit
        lots = math.floor(raw_units / params.lot_size)
        executable_quantity = lots * params.lot_size

        if executable_quantity <= 0:
            warnings.append(
                f"Computed quantity is 0 lots. Account equity ({params.equity:.2f}) or allowed risk "
                f"({params.risk_percentage}%) is too low for the required stop distance ({stop_distance:.2f} pts)."
            )

        actual_risk_amount = executable_quantity * risk_per_unit
        potential_profit = executable_quantity * target_distance * params.value_per_point
        rr_ratio = round(target_distance / stop_distance, 2)

        if rr_ratio < 1.5:
            warnings.append(f"Risk-to-reward ratio ({rr_ratio}:1) is below recommended 1.5:1 threshold.")

        # 4. Friction Calculation (Fees, Taxes, Slippage)
        notional_entry = executable_quantity * params.entry_price * params.value_per_point
        notional_exit = executable_quantity * params.target_price * params.value_per_point
        total_turnover = notional_entry + notional_exit

        # Brokerage (round trip = 2 orders)
        brokerage = params.brokerage_per_order * 2.0
        # Exchange fee and STT/taxes
        exchange_fees = total_turnover * (params.exchange_fee_pct / 100.0)
        taxes = total_turnover * (params.tax_pct / 100.0)
        total_fees_taxes = brokerage + exchange_fees + taxes

        # Slippage: slippage_ticks * tick_size per unit on round trip
        slippage_cost = executable_quantity * (params.slippage_ticks * params.tick_size * 2) * params.value_per_point
        total_friction = total_fees_taxes + slippage_cost

        # 5. Breakeven Price
        # Cost per unit points
        cost_per_unit_points = (total_friction / max(executable_quantity * params.value_per_point, 1.0))
        if is_long:
            breakeven_price = round(params.entry_price + cost_per_unit_points, 2)
        else:
            breakeven_price = round(params.entry_price - cost_per_unit_points, 2)

        # 6. Estimated Margin (Intraday / Leverage proxy ~20% of notional)
        estimated_margin = notional_entry * 0.20

        is_valid = executable_quantity > 0 and stop_distance > 0

        return RiskCalculatorOutput(
            max_risk_amount=round(max_risk_currency, 2),
            stop_distance=round(stop_distance, 2),
            target_distance=round(target_distance, 2),
            risk_reward_ratio=rr_ratio,
            raw_quantity=round(raw_units, 2),
            lots=lots,
            executable_quantity=executable_quantity,
            actual_risk_amount=round(actual_risk_amount, 2),
            potential_profit=round(potential_profit, 2),
            estimated_fees_and_taxes=round(total_fees_taxes, 2),
            estimated_slippage_cost=round(slippage_cost, 2),
            total_estimated_friction=round(total_friction, 2),
            breakeven_price=breakeven_price,
            estimated_margin=round(estimated_margin, 2),
            is_valid=is_valid,
            warnings=warnings,
        )
