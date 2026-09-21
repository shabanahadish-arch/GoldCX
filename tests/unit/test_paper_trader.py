"""
Unit Tests for Virtual Portfolio and Paper Trading Execution Engine
"""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from data.candle_builder import CandleRecord
from execution.portfolio import (
    OrderSide,
    OrderStatus,
    OrderType,
    PositionStatus,
    VirtualPortfolio,
)
from execution.paper_trader import PaperTradingEngine, PaperTradingConfig


def create_candle(symbol: str, o: float, h: float, l: float, c: float) -> CandleRecord:
    candle = CandleRecord(
        time=datetime.now(timezone.utc),
        open=Decimal(str(o)),
        high=Decimal(str(h)),
        low=Decimal(str(l)),
        close=Decimal(str(c)),
        volume=Decimal("1000"),
        is_complete=True,
    )
    candle.symbol = symbol  # type: ignore
    return candle


def test_virtual_portfolio_initial_state_and_mtm():
    portfolio = VirtualPortfolio(initial_capital=500000.0)
    metrics = portfolio.get_metrics()

    assert metrics.initial_capital == 500000.0
    assert metrics.cash == 500000.0
    assert metrics.margin_used == 0.0
    assert metrics.total_equity == 500000.0
    assert metrics.open_positions_count == 0
    assert metrics.is_live_trading_enabled is False


def test_paper_trading_order_fill_and_margin():
    portfolio = VirtualPortfolio(initial_capital=200000.0)
    engine = PaperTradingEngine(portfolio=portfolio)

    # Buy 100 shares of NIFTY at 21,000 (Market order)
    # Slippage: 2 ticks * 0.05 = 0.10 -> Fill price: 21,000.10
    # Notional value: 100 * 21000.10 = 2,100,010
    # Margin requirement (20%): 420,002 -> Exceeds 200,000 cash -> REJECTED!
    order_fail = engine.submit_order(
        symbol="NIFTY",
        side=OrderSide.BUY,
        quantity=100,
        current_market_price=21000.0,
    )
    assert order_fail.status == OrderStatus.REJECTED
    assert "Insufficient funds" in (order_fail.rejection_reason or "")

    # Now buy 5 shares at 21,000 -> Notional ~105,000 -> Margin ~21,000 -> Accepted!
    order_ok = engine.submit_order(
        symbol="NIFTY",
        side=OrderSide.BUY,
        quantity=5,
        current_market_price=21000.0,
        stop_price=20900.0,
        target_price=21200.0,
    )
    assert order_ok.status == OrderStatus.FILLED
    assert order_ok.executed_price == 21000.10
    assert len(portfolio.open_positions) == 1

    pos = list(portfolio.open_positions.values())[0]
    assert pos.quantity == 5
    assert pos.entry_price == 21000.10
    assert pos.status == PositionStatus.OPEN


def test_stop_loss_trigger_on_candle():
    portfolio = VirtualPortfolio(initial_capital=200000.0)
    engine = PaperTradingEngine(portfolio=portfolio)

    # Open Long at 100 with stop at 95 and target at 110
    engine.submit_order(
        symbol="TEST",
        side=OrderSide.BUY,
        quantity=10,
        current_market_price=100.0,
        stop_price=95.0,
        target_price=110.0,
    )
    assert len(portfolio.open_positions) == 1

    # Ingest a candle that drops to 94 (breaches 95 stop)
    candle = create_candle("TEST", 99.0, 101.0, 94.0, 96.0)
    closed = engine.on_candle_update(candle)

    assert len(closed) == 1
    assert closed[0].status == PositionStatus.STOPPED_OUT
    assert len(portfolio.open_positions) == 0
    assert len(portfolio.closed_positions) == 1
    assert portfolio.realized_pnl < 0.0  # Loss recorded


def test_emergency_kill_switch():
    portfolio = VirtualPortfolio(initial_capital=200000.0)
    engine = PaperTradingEngine(portfolio=portfolio)

    # Open two positions
    engine.submit_order("SYM_A", OrderSide.BUY, 5, current_market_price=100.0)
    engine.submit_order("SYM_B", OrderSide.SELL, 5, current_market_price=200.0)

    assert len(portfolio.open_positions) == 2

    # Execute Emergency Kill Switch
    liquidated = engine.emergency_liquidate_all(
        current_prices={"SYM_A": 102.0, "SYM_B": 198.0}
    )

    assert len(liquidated) == 2
    assert len(portfolio.open_positions) == 0
    assert portfolio.is_trading_halted is True
    assert "KILL_SWITCH" in (portfolio.halt_reason or "")

    # Attempting to place an order while halted must be rejected
    rejected_order = engine.submit_order("SYM_A", OrderSide.BUY, 1, current_market_price=100.0)
    assert rejected_order.status == OrderStatus.REJECTED
    assert "Trading is halted" in (rejected_order.rejection_reason or "")

    # Resume trading
    engine.resume_trading()
    assert portfolio.is_trading_halted is False
