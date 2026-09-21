"""
RiskPilot 8D - Virtual Portfolio & Position Ledger
Maintains cash balances, margin allocations, active position lifecycles,
realized/unrealized profit & loss, and audit logs for paper trading.
"""

from datetime import datetime, timezone
from decimal import Decimal
import math
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OrderType:
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"


class OrderStatus:
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class OrderSide:
    BUY = "BUY"
    SELL = "SELL"


class PositionStatus:
    OPEN = "OPEN"
    STOPPED_OUT = "STOPPED_OUT"
    TARGET_REACHED = "TARGET_REACHED"
    INVALIDATION_EXIT = "INVALIDATION_EXIT"
    CLOSED_MANUAL = "CLOSED_MANUAL"
    LIQUIDATED = "LIQUIDATED"


class VirtualOrder(BaseModel):
    id: str
    symbol: str
    side: str  # BUY, SELL
    order_type: str  # MARKET, LIMIT, STOP, STOP_LIMIT
    quantity: int
    filled_quantity: int = 0
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    executed_price: Optional[float] = None
    status: str = OrderStatus.PENDING
    submitted_at: datetime
    filled_at: Optional[datetime] = None
    fees: float = 0.0
    slippage: float = 0.0
    rejection_reason: Optional[str] = None


class VirtualPosition(BaseModel):
    id: str
    symbol: str
    side: str  # LONG, SHORT
    quantity: int
    entry_price: float
    current_price: float
    stop_price: Optional[float] = None
    target_price: Optional[float] = None
    breakeven_price: Optional[float] = None
    value_per_point: float = 1.0
    margin_allocated: float = 0.0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    total_fees_paid: float = 0.0
    opened_at: datetime
    closed_at: Optional[datetime] = None
    status: str = PositionStatus.OPEN
    exit_reason: Optional[str] = None


class PortfolioMetrics(BaseModel):
    initial_capital: float
    cash: float
    margin_used: float
    margin_available: float
    unrealized_pnl: float
    realized_pnl: float
    total_equity: float
    daily_pnl: float
    daily_pnl_pct: float
    peak_equity: float
    drawdown_amount: float
    drawdown_pct: float
    open_positions_count: int
    total_trades_count: int
    win_trades_count: int
    loss_trades_count: int
    win_rate_pct: float
    is_live_trading_enabled: bool = False
    is_trading_halted: bool = False
    halt_reason: Optional[str] = None


class VirtualPortfolio:
    """
    In-memory and ledger-compliant virtual portfolio.
    Manages accounts, orders, positions, and mathematical mark-to-market valuations.
    """

    def __init__(self, initial_capital: float = 500000.0, currency: str = "INR"):
        self.initial_capital = initial_capital
        self.currency = currency
        self.cash = initial_capital
        self.margin_used = 0.0
        self.realized_pnl = 0.0
        self.daily_start_equity = initial_capital
        self.peak_equity = initial_capital
        
        # Open positions: id -> VirtualPosition
        self.open_positions: Dict[str, VirtualPosition] = {}
        # Closed positions history
        self.closed_positions: List[VirtualPosition] = []
        # Orders: id -> VirtualOrder
        self.orders: Dict[str, VirtualOrder] = []
        self.orders_map: Dict[str, VirtualOrder] = {}

        # Circuit breakers & safety controls
        self.is_live_trading_enabled = False  # Strictly disabled by default
        self.is_trading_halted = False
        self.halt_reason: Optional[str] = None

    def reset(self, new_capital: Optional[float] = None) -> None:
        """Resets virtual portfolio to pristine starting state."""
        cap = new_capital or self.initial_capital
        self.initial_capital = cap
        self.cash = cap
        self.margin_used = 0.0
        self.realized_pnl = 0.0
        self.daily_start_equity = cap
        self.peak_equity = cap
        self.open_positions.clear()
        self.closed_positions.clear()
        self.orders_map.clear()
        self.is_trading_halted = False
        self.halt_reason = None

    def update_market_price(self, symbol: str, current_price: float) -> None:
        """Updates mark-to-market unrealized PnL for all active positions of symbol."""
        for pos in self.open_positions.values():
            if pos.symbol == symbol and pos.status == PositionStatus.OPEN:
                pos.current_price = current_price
                if pos.side == "LONG":
                    pos.unrealized_pnl = (current_price - pos.entry_price) * pos.quantity * pos.value_per_point
                else:
                    pos.unrealized_pnl = (pos.entry_price - current_price) * pos.quantity * pos.value_per_point

    def get_unrealized_pnl(self) -> float:
        return sum(pos.unrealized_pnl for pos in self.open_positions.values())

    def get_total_equity(self) -> float:
        return self.cash + self.margin_used + self.get_unrealized_pnl()

    def get_metrics(self) -> PortfolioMetrics:
        unrealized = self.get_unrealized_pnl()
        total_equity = self.get_total_equity()

        if total_equity > self.peak_equity:
            self.peak_equity = total_equity

        dd_amt = max(0.0, self.peak_equity - total_equity)
        dd_pct = (dd_amt / self.peak_equity * 100.0) if self.peak_equity > 0 else 0.0

        daily_pnl = total_equity - self.daily_start_equity
        daily_pnl_pct = (daily_pnl / self.daily_start_equity * 100.0) if self.daily_start_equity > 0 else 0.0

        total_trades = len(self.closed_positions)
        wins = sum(1 for p in self.closed_positions if p.realized_pnl > 0)
        losses = sum(1 for p in self.closed_positions if p.realized_pnl <= 0)
        win_rate = (wins / total_trades * 100.0) if total_trades > 0 else 0.0

        return PortfolioMetrics(
            initial_capital=round(self.initial_capital, 2),
            cash=round(self.cash, 2),
            margin_used=round(self.margin_used, 2),
            margin_available=round(max(0.0, self.cash), 2),
            unrealized_pnl=round(unrealized, 2),
            realized_pnl=round(self.realized_pnl, 2),
            total_equity=round(total_equity, 2),
            daily_pnl=round(daily_pnl, 2),
            daily_pnl_pct=round(daily_pnl_pct, 2),
            peak_equity=round(self.peak_equity, 2),
            drawdown_amount=round(dd_amt, 2),
            drawdown_pct=round(dd_pct, 2),
            open_positions_count=len(self.open_positions),
            total_trades_count=total_trades,
            win_trades_count=wins,
            loss_trades_count=losses,
            win_rate_pct=round(win_rate, 1),
            is_live_trading_enabled=self.is_live_trading_enabled,
            is_trading_halted=self.is_trading_halted,
            halt_reason=self.halt_reason,
        )
