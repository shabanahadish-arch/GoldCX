"""
RiskPilot 8D - Paper Trading API Routes
Manages virtual orders, positions, MTM portfolio valuations, and emergency kill switches.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.market_store import market_store
from execution.portfolio import OrderSide, OrderType, PositionStatus

router = APIRouter(prefix="/api/v1/paper", tags=["Paper Trading & Portfolio"])


class SubmitOrderRequest(BaseModel):
    symbol: str = Field("NIFTY", description="Asset symbol")
    side: str = Field("BUY", description="BUY or SELL")
    quantity: int = Field(50, ge=1, description="Quantity in contract units")
    order_type: str = Field("MARKET", description="MARKET or LIMIT")
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    target_price: Optional[float] = None
    value_per_point: float = 1.0


class ClosePositionRequest(BaseModel):
    position_id: str
    exit_market_price: Optional[float] = None


class KillSwitchRequest(BaseModel):
    current_prices: Optional[Dict[str, float]] = None


@router.get("/portfolio")
async def get_portfolio_status() -> Dict[str, Any]:
    """Returns current paper portfolio balance, equity, drawdown, open positions, and recent trades."""
    metrics = market_store.portfolio.get_metrics()
    open_positions = list(market_store.portfolio.open_positions.values())
    closed_positions = market_store.portfolio.closed_positions[-20:]

    return {
        "metrics": metrics.model_dump(),
        "open_positions": [
            {
                "id": p.id,
                "symbol": p.symbol,
                "side": p.side,
                "quantity": p.quantity,
                "entry_price": p.entry_price,
                "current_price": p.current_price,
                "stop_price": p.stop_price,
                "target_price": p.target_price,
                "breakeven_price": p.breakeven_price,
                "unrealized_pnl": p.unrealized_pnl,
                "margin_allocated": p.margin_allocated,
                "opened_at": p.opened_at.isoformat(),
                "status": p.status,
            }
            for p in open_positions
        ],
        "recent_trades": [
            {
                "id": cp.id,
                "symbol": cp.symbol,
                "side": cp.side,
                "quantity": cp.quantity,
                "entry_price": cp.entry_price,
                "exit_price": cp.current_price,
                "realized_pnl": cp.realized_pnl,
                "total_fees_paid": cp.total_fees_paid,
                "exit_reason": cp.exit_reason,
                "opened_at": cp.opened_at.isoformat(),
                "closed_at": cp.closed_at.isoformat() if cp.closed_at else None,
            }
            for cp in reversed(closed_positions)
        ],
    }


@router.post("/order")
async def submit_paper_order(req: SubmitOrderRequest) -> Dict[str, Any]:
    """Submits a virtual paper order through the execution state machine."""
    # Obtain current market price from latest candle if not provided
    candles = market_store.get_candles(req.symbol, timeframe="5m", limit=1)
    current_price = float(candles[-1].close) if candles else (req.limit_price or 100.0)

    order = market_store.paper_engine.submit_order(
        symbol=req.symbol.upper(),
        side=req.side.upper(),
        quantity=req.quantity,
        order_type=req.order_type.upper(),
        current_market_price=current_price,
        limit_price=req.limit_price,
        stop_price=req.stop_price,
        target_price=req.target_price,
        value_per_point=req.value_per_point,
    )

    return {
        "order_id": order.id,
        "symbol": order.symbol,
        "side": order.side,
        "status": order.status,
        "executed_price": order.executed_price,
        "filled_quantity": order.filled_quantity,
        "fees": order.fees,
        "slippage": order.slippage,
        "rejection_reason": order.rejection_reason,
    }


@router.post("/close-position")
async def close_paper_position(req: ClosePositionRequest) -> Dict[str, Any]:
    pos = market_store.portfolio.open_positions.get(req.position_id)
    if not pos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Open position {req.position_id} not found.",
        )

    exit_price = req.exit_market_price or pos.current_price
    closed = market_store.paper_engine.close_position(
        position_id=req.position_id,
        current_market_price=exit_price,
        exit_reason=PositionStatus.CLOSED_MANUAL,
    )

    if not closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to close position.",
        )

    return {
        "status": "closed",
        "position_id": closed.id,
        "exit_price": closed.current_price,
        "realized_pnl": closed.realized_pnl,
        "fees": closed.total_fees_paid,
    }


@router.post("/kill-switch")
async def emergency_kill_switch(req: KillSwitchRequest) -> Dict[str, Any]:
    """
    Emergency Kill Switch: immediately liquidates all positions at market,
    cancels pending orders, and freezes further trading.
    """
    prices = req.current_prices or {}
    # Fill in prices from current candles if not provided
    for pos in market_store.portfolio.open_positions.values():
        if pos.symbol not in prices:
            candles = market_store.get_candles(pos.symbol, timeframe="5m", limit=1)
            prices[pos.symbol] = float(candles[-1].close) if candles else pos.current_price

    liquidated = market_store.paper_engine.emergency_liquidate_all(prices)

    return {
        "status": "HALTED",
        "halt_reason": market_store.portfolio.halt_reason,
        "liquidated_positions_count": len(liquidated),
        "liquidated_positions": [p.id for p in liquidated],
    }


@router.post("/resume")
async def resume_trading() -> Dict[str, Any]:
    """Clears trading halt after operator inspection."""
    market_store.paper_engine.resume_trading()
    return {
        "status": "ACTIVE",
        "is_trading_halted": market_store.portfolio.is_trading_halted,
    }


@router.post("/reset")
async def reset_portfolio() -> Dict[str, Any]:
    """Resets virtual portfolio to initial capital (default: ₹500,000)."""
    market_store.portfolio.reset()
    return {
        "status": "RESET",
        "initial_capital": market_store.portfolio.initial_capital,
        "cash": market_store.portfolio.cash,
        "total_equity": market_store.portfolio.get_total_equity(),
    }
