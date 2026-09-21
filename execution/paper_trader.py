"""
RiskPilot 8D - Paper Trading Execution Engine
Simulates realistic broker order lifecycles, fills, slippage, friction,
margin allocation, and real-time capital preservation circuit breakers.
"""

from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
import uuid

from data.candle_builder import CandleRecord
from execution.portfolio import (
    OrderSide,
    OrderStatus,
    OrderType,
    PositionStatus,
    VirtualOrder,
    VirtualPosition,
    VirtualPortfolio,
    PortfolioMetrics,
)


class PaperTradingConfig:
    def __init__(
        self,
        brokerage_per_order: float = 20.0,
        exchange_fee_pct: float = 0.0035,
        tax_pct: float = 0.018,
        slippage_ticks: int = 2,
        tick_size: float = 0.05,
        margin_requirement_pct: float = 20.0,  # 20% margin for intraday
        max_daily_loss_pct: float = 3.0,       # 3% daily circuit breaker
        max_drawdown_halt_pct: float = 6.0,     # 6% peak drawdown halt
    ):
        self.brokerage_per_order = brokerage_per_order
        self.exchange_fee_pct = exchange_fee_pct
        self.tax_pct = tax_pct
        self.slippage_ticks = slippage_ticks
        self.tick_size = tick_size
        self.margin_requirement_pct = margin_requirement_pct
        self.max_daily_loss_pct = max_daily_loss_pct
        self.max_drawdown_halt_pct = max_drawdown_halt_pct


class PaperTradingEngine:
    """
    Simulates institutional execution, fill validation, and portfolio safety rules.
    """

    def __init__(
        self,
        portfolio: Optional[VirtualPortfolio] = None,
        config: Optional[PaperTradingConfig] = None,
    ):
        self.portfolio = portfolio or VirtualPortfolio()
        self.config = config or PaperTradingConfig()

    def submit_order(
        self,
        symbol: str,
        side: str,  # BUY, SELL
        quantity: int,
        order_type: str = OrderType.MARKET,
        current_market_price: Optional[float] = None,
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
        target_price: Optional[float] = None,
        value_per_point: float = 1.0,
    ) -> VirtualOrder:
        """
        Submits and processes a virtual order through the execution state machine.
        """
        now = datetime.now(timezone.utc)
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"

        order = VirtualOrder(
            id=order_id,
            symbol=symbol,
            side=side,
            order_type=order_type,
            quantity=quantity,
            limit_price=limit_price,
            stop_price=stop_price,
            submitted_at=now,
            status=OrderStatus.SUBMITTED,
        )
        self.portfolio.orders_map[order_id] = order

        # Safety Gate 1: Check if trading is halted
        if self.portfolio.is_trading_halted:
            order.status = OrderStatus.REJECTED
            order.rejection_reason = f"Trading is halted: {self.portfolio.halt_reason}"
            return order

        # Safety Gate 2: Live Trading Lock
        # If order was intended for live, paper engine rejects; paper mode is strictly isolated
        if self.portfolio.is_live_trading_enabled:
            order.status = OrderStatus.REJECTED
            order.rejection_reason = "Live trading is prohibited in paper execution engine."
            return order

        # Determine execution price with slippage
        ref_price = current_market_price or limit_price
        if not ref_price or ref_price <= 0:
            order.status = OrderStatus.REJECTED
            order.rejection_reason = "No valid market or limit price available for execution."
            return order

        slippage_pts = self.config.slippage_ticks * self.config.tick_size
        if side == OrderSide.BUY:
            fill_price = ref_price + slippage_pts
        else:
            fill_price = max(self.config.tick_size, ref_price - slippage_pts)

        # Margin Calculation
        notional_value = quantity * fill_price * value_per_point
        required_margin = notional_value * (self.config.margin_requirement_pct / 100.0)

        # Check Available Cash
        if required_margin > self.portfolio.cash:
            order.status = OrderStatus.REJECTED
            order.rejection_reason = (
                f"Insufficient funds: Required margin ₹{required_margin:.2f} exceeds "
                f"available cash ₹{self.portfolio.cash:.2f}."
            )
            return order

        # Compute Execution Frictions
        turnover = notional_value
        brokerage = self.config.brokerage_per_order
        exchange_fee = turnover * (self.config.exchange_fee_pct / 100.0)
        taxes = turnover * (self.config.tax_pct / 100.0)
        total_fees = brokerage + exchange_fee + taxes

        # Deduct margin and fees from cash
        self.portfolio.cash -= (required_margin + total_fees)
        self.portfolio.margin_used += required_margin

        order.status = OrderStatus.FILLED
        order.filled_quantity = quantity
        order.executed_price = round(fill_price, 4)
        order.filled_at = datetime.now(timezone.utc)
        order.fees = round(total_fees, 2)
        order.slippage = round(slippage_pts * quantity * value_per_point, 2)

        # Establish Virtual Position
        pos_id = f"POS-{symbol}-{uuid.uuid4().hex[:6].upper()}"
        pos_side = "LONG" if side == OrderSide.BUY else "SHORT"

        # Calculate estimated breakeven price with round-trip friction
        friction_per_unit = (total_fees * 2.0) / max(quantity * value_per_point, 1.0)
        be_price = fill_price + friction_per_unit if pos_side == "LONG" else fill_price - friction_per_unit

        position = VirtualPosition(
            id=pos_id,
            symbol=symbol,
            side=pos_side,
            quantity=quantity,
            entry_price=round(fill_price, 4),
            current_price=round(fill_price, 4),
            stop_price=stop_price,
            target_price=target_price,
            breakeven_price=round(be_price, 4),
            value_per_point=value_per_point,
            margin_allocated=round(required_margin, 2),
            total_fees_paid=round(total_fees, 2),
            opened_at=order.filled_at,
            status=PositionStatus.OPEN,
        )
        self.portfolio.open_positions[pos_id] = position

        # Check circuit breakers immediately after trade execution
        self._check_circuit_breakers()

        return order

    def close_position(
        self,
        position_id: str,
        current_market_price: float,
        exit_reason: str = PositionStatus.CLOSED_MANUAL,
    ) -> Optional[VirtualPosition]:
        """
        Closes an active position, settles realized PnL, releases margin, and records fees.
        """
        pos = self.portfolio.open_positions.get(position_id)
        if not pos or pos.status != PositionStatus.OPEN:
            return None

        now = datetime.now(timezone.utc)
        slippage_pts = self.config.slippage_ticks * self.config.tick_size

        if pos.side == "LONG":
            exit_price = max(self.config.tick_size, current_market_price - slippage_pts)
            gross_pnl = (exit_price - pos.entry_price) * pos.quantity * pos.value_per_point
        else:
            exit_price = current_market_price + slippage_pts
            gross_pnl = (pos.entry_price - exit_price) * pos.quantity * pos.value_per_point

        # Exit friction
        exit_notional = pos.quantity * exit_price * pos.value_per_point
        brokerage = self.config.brokerage_per_order
        exchange_fee = exit_notional * (self.config.exchange_fee_pct / 100.0)
        taxes = exit_notional * (self.config.tax_pct / 100.0)
        exit_fees = brokerage + exchange_fee + taxes

        net_pnl = gross_pnl - exit_fees

        # Update Portfolio Balances
        # Release margin back to cash
        self.portfolio.cash += pos.margin_allocated + net_pnl
        self.portfolio.margin_used = max(0.0, self.portfolio.margin_used - pos.margin_allocated)
        self.portfolio.realized_pnl += net_pnl

        # Finalize position record
        pos.current_price = round(exit_price, 4)
        pos.realized_pnl = round(net_pnl, 2)
        pos.unrealized_pnl = 0.0
        pos.total_fees_paid += round(exit_fees, 2)
        pos.closed_at = now
        pos.status = exit_reason
        pos.exit_reason = exit_reason

        # Move from open to closed ledger
        del self.portfolio.open_positions[position_id]
        self.portfolio.closed_positions.append(pos)

        # Check circuit breakers after trade realization
        self._check_circuit_breakers()

        return pos

    def on_candle_update(self, candle: CandleRecord) -> List[VirtualPosition]:
        """
        Processes new bar, updates mark-to-market prices, and checks stop loss / target hits.
        """
        symbol = candle.symbol if hasattr(candle, "symbol") else "UNKNOWN"
        h = float(candle.high)
        l = float(candle.low)
        c = float(candle.close)

        # Update MTM
        self.portfolio.update_market_price(symbol, c)

        closed_this_bar: List[VirtualPosition] = []

        # Check each open position for symbol
        active_ids = list(self.portfolio.open_positions.keys())
        for pid in active_ids:
            pos = self.portfolio.open_positions.get(pid)
            if not pos or pos.status != PositionStatus.OPEN:
                continue

            if pos.side == "LONG":
                # Check Stop Loss
                if pos.stop_price and l <= pos.stop_price:
                    res = self.close_position(pid, pos.stop_price, exit_reason=PositionStatus.STOPPED_OUT)
                    if res:
                        closed_this_bar.append(res)
                # Check Profit Target
                elif pos.target_price and h >= pos.target_price:
                    res = self.close_position(pid, pos.target_price, exit_reason=PositionStatus.TARGET_REACHED)
                    if res:
                        closed_this_bar.append(res)
            else:  # SHORT
                # Check Stop Loss
                if pos.stop_price and h >= pos.stop_price:
                    res = self.close_position(pid, pos.stop_price, exit_reason=PositionStatus.STOPPED_OUT)
                    if res:
                        closed_this_bar.append(res)
                # Check Profit Target
                elif pos.target_price and l <= pos.target_price:
                    res = self.close_position(pid, pos.target_price, exit_reason=PositionStatus.TARGET_REACHED)
                    if res:
                        closed_this_bar.append(res)

        self._check_circuit_breakers()
        return closed_this_bar

    def emergency_liquidate_all(self, current_prices: Dict[str, float]) -> List[VirtualPosition]:
        """
        Emergency Kill Switch: Cancels all pending orders, closes all open positions at market,
        and halts further trading until explicitly resumed.
        """
        self.portfolio.is_trading_halted = True
        self.portfolio.halt_reason = "EMERGENCY_KILL_SWITCH_ACTIVATED"

        # Cancel pending orders
        for order in self.portfolio.orders_map.values():
            if order.status in (OrderStatus.PENDING, OrderStatus.SUBMITTED):
                order.status = OrderStatus.CANCELLED
                order.rejection_reason = "Cancelled by Emergency Kill Switch"

        closed_list: List[VirtualPosition] = []
        open_ids = list(self.portfolio.open_positions.keys())
        for pid in open_ids:
            pos = self.portfolio.open_positions.get(pid)
            if not pos:
                continue
            p = current_prices.get(pos.symbol, pos.current_price)
            closed = self.close_position(pid, p, exit_reason=PositionStatus.LIQUIDATED)
            if closed:
                closed_list.append(closed)

        return closed_list

    def resume_trading(self) -> None:
        """Clears trading halt after operator inspection."""
        self.portfolio.is_trading_halted = False
        self.portfolio.halt_reason = None

    def _check_circuit_breakers(self) -> None:
        """Monitors daily loss limits and peak drawdown thresholds."""
        metrics = self.portfolio.get_metrics()

        # Daily loss circuit breaker
        if metrics.daily_pnl_pct <= -abs(self.config.max_daily_loss_pct):
            self.portfolio.is_trading_halted = True
            self.portfolio.halt_reason = (
                f"DAILY_LOSS_LIMIT_BREACHED: Daily loss {metrics.daily_pnl_pct:.2f}% "
                f"exceeds allowed {self.config.max_daily_loss_pct:.2f}%"
            )

        # Max drawdown circuit breaker
        elif metrics.drawdown_pct >= self.config.max_drawdown_halt_pct:
            self.portfolio.is_trading_halted = True
            self.portfolio.halt_reason = (
                f"MAX_DRAWDOWN_LIMIT_BREACHED: Drawdown {metrics.drawdown_pct:.2f}% "
                f"exceeds allowed {self.config.max_drawdown_halt_pct:.2f}%"
            )
