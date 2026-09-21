"""
RiskPilot 8D - Historical Backtesting & Walk-Forward Simulation Engine
Simulates realistic trade lifecycles bar-by-bar with zero look-ahead bias,
modeling broker commissions, exchange turnover fees, taxes, and slippage.
"""

from datetime import datetime
from decimal import Decimal
import math
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from data.candle_builder import CandleRecord
from engine.dimension_orchestrator import DimensionOrchestrator
from engine.signals import SignalEngine, SignalOutput
from engine.risk_calculator import RiskCalculator, RiskCalculatorInput


class BacktestConfig(BaseModel):
    symbol: str
    timeframe: str = "5m"
    initial_capital: float = 500000.0
    risk_per_trade_pct: float = 1.0
    lot_size: int = 50
    value_per_point: float = 1.0
    tick_size: float = 0.05
    brokerage_per_order: float = 20.0
    exchange_fee_pct: float = 0.0035
    tax_pct: float = 0.018
    slippage_ticks: int = 2
    require_htf_alignment: bool = False
    max_holding_bars: int = 50
    target_rr_multiple: float = 2.0


class TradeRecord(BaseModel):
    id: str
    symbol: str
    direction: str  # LONG, SHORT
    entry_time: datetime
    exit_time: datetime
    entry_price: float
    exit_price: float
    quantity: int
    gross_pnl: float
    fees_and_taxes: float
    slippage_cost: float
    net_pnl: float
    return_pct: float
    exit_reason: str  # TARGET, STOP, INVALIDATION, TIME_LIMIT
    holding_bars: int
    invalidation_note: Optional[str] = None


class EquityPoint(BaseModel):
    time: datetime
    equity: float
    drawdown_pct: float
    cash: float
    trades_count: int


class BacktestSummary(BaseModel):
    symbol: str
    timeframe: str
    initial_capital: float
    final_equity: float
    net_pnl: float
    return_pct: float
    buy_and_hold_return_pct: float
    total_trades: int
    win_count: int
    loss_count: int
    win_rate_pct: float
    profit_factor: float
    expectancy: float
    max_drawdown_amount: float
    max_drawdown_pct: float
    max_consecutive_losses: int
    avg_holding_bars: float
    total_friction_paid: float
    trades: List[TradeRecord]
    equity_curve: List[EquityPoint]


class BacktestEngine:
    """
    Executes walk-forward bar-by-bar backtest simulation.
    """

    @classmethod
    def run(
        cls,
        candles: List[CandleRecord],
        config: BacktestConfig,
        warmup_bars: int = 40,
    ) -> BacktestSummary:
        if len(candles) <= warmup_bars:
            raise ValueError(f"Need at least {warmup_bars + 5} bars for backtesting, got {len(candles)}")

        equity = config.initial_capital
        cash = equity
        peak_equity = equity
        max_drawdown_amount = 0.0
        max_drawdown_pct = 0.0

        equity_curve: List[EquityPoint] = [
            EquityPoint(
                time=candles[warmup_bars - 1].time,
                equity=equity,
                drawdown_pct=0.0,
                cash=cash,
                trades_count=0,
            )
        ]

        closed_trades: List[TradeRecord] = []
        active_trade: Optional[Dict[str, Any]] = None
        consecutive_losses = 0
        max_consecutive_losses = 0
        total_friction_sum = 0.0

        slippage_per_unit = config.slippage_ticks * config.tick_size

        # Walk forward starting from warmup_bars
        for i in range(warmup_bars, len(candles)):
            curr_bar = candles[i]
            curr_ts = curr_bar.time
            o = float(curr_bar.open)
            h = float(curr_bar.high)
            l = float(curr_bar.low)
            c = float(curr_bar.close)

            # 1. Manage Active Position
            if active_trade:
                active_trade["holding_bars"] += 1
                direction = active_trade["direction"]
                entry_p = active_trade["entry_price"]
                stop_p = active_trade["stop_price"]
                target_p = active_trade["target_price"]
                qty = active_trade["quantity"]

                exit_price: Optional[float] = None
                exit_reason: Optional[str] = None

                # Check Stop / Target hits within current bar
                if direction == "LONG":
                    hit_stop = l <= stop_p
                    hit_target = h >= target_p

                    # Conservative assumption: If both triggered in same bar, assume stop hit first
                    if hit_stop:
                        exit_price = min(o, stop_p) - slippage_per_unit
                        exit_reason = "STOP"
                    elif hit_target:
                        exit_price = max(o, target_p) - slippage_per_unit
                        exit_reason = "TARGET"
                    elif active_trade["holding_bars"] >= config.max_holding_bars:
                        exit_price = c - slippage_per_unit
                        exit_reason = "TIME_LIMIT"
                else:  # SHORT
                    hit_stop = h >= stop_p
                    hit_target = l <= target_p

                    if hit_stop:
                        exit_price = max(o, stop_p) + slippage_per_unit
                        exit_reason = "STOP"
                    elif hit_target:
                        exit_price = min(o, target_p) + slippage_per_unit
                        exit_reason = "TARGET"
                    elif active_trade["holding_bars"] >= config.max_holding_bars:
                        exit_price = c + slippage_per_unit
                        exit_reason = "TIME_LIMIT"

                # Check Invalidation by running dimension orchestrator
                if not exit_reason:
                    visible_slice = candles[:i + 1]
                    analysis = DimensionOrchestrator.analyze(
                        symbol=config.symbol,
                        timeframe=config.timeframe,
                        candles=visible_slice,
                    )
                    score = analysis.composite_score.weighted_score
                    if direction == "LONG" and score < 10.0:
                        exit_price = c - slippage_per_unit
                        exit_reason = "INVALIDATION"
                    elif direction == "SHORT" and score > -10.0:
                        exit_price = c + slippage_per_unit
                        exit_reason = "INVALIDATION"

                # If position exited, finalize trade accounting
                if exit_reason and exit_price is not None:
                    if direction == "LONG":
                        gross_pnl = (exit_price - entry_p) * qty * config.value_per_point
                    else:
                        gross_pnl = (entry_p - exit_price) * qty * config.value_per_point

                    # Calculate exact frictions
                    turnover = (entry_p + exit_price) * qty * config.value_per_point
                    brokerage = config.brokerage_per_order * 2.0
                    exchange_fees = turnover * (config.exchange_fee_pct / 100.0)
                    taxes = turnover * (config.tax_pct / 100.0)
                    fees_and_taxes = brokerage + exchange_fees + taxes
                    slippage_cost = qty * (slippage_per_unit * 2.0) * config.value_per_point
                    total_friction = fees_and_taxes + slippage_cost
                    net_pnl = gross_pnl - total_friction

                    equity += net_pnl
                    cash = equity
                    total_friction_sum += total_friction

                    trade_return_pct = (net_pnl / (entry_p * qty * config.value_per_point)) * 100.0

                    if net_pnl < 0:
                        consecutive_losses += 1
                        if consecutive_losses > max_consecutive_losses:
                            max_consecutive_losses = consecutive_losses
                    else:
                        consecutive_losses = 0

                    trade_record = TradeRecord(
                        id=f"TRD-{len(closed_trades) + 1}",
                        symbol=config.symbol,
                        direction=direction,
                        entry_time=active_trade["entry_time"],
                        exit_time=curr_ts,
                        entry_price=round(entry_p, 2),
                        exit_price=round(exit_price, 2),
                        quantity=qty,
                        gross_pnl=round(gross_pnl, 2),
                        fees_and_taxes=round(fees_and_taxes, 2),
                        slippage_cost=round(slippage_cost, 2),
                        net_pnl=round(net_pnl, 2),
                        return_pct=round(trade_return_pct, 2),
                        exit_reason=exit_reason,
                        holding_bars=active_trade["holding_bars"],
                    )
                    closed_trades.append(trade_record)
                    active_trade = None

            # 2. Check for New Entry Signal if Flat
            if active_trade is None:
                # Strictly pass visible history up to curr_bar
                visible_slice = candles[:i + 1]
                analysis = DimensionOrchestrator.analyze(
                    symbol=config.symbol,
                    timeframe=config.timeframe,
                    candles=visible_slice,
                )

                signal = SignalEngine.evaluate(
                    analysis=analysis,
                    candles=visible_slice,
                    require_htf_alignment=config.require_htf_alignment,
                    tick_size=config.tick_size,
                    target_rr_multiple=config.target_rr_multiple,
                )

                if signal and signal.direction in ("LONG", "SHORT"):
                    calc_res = RiskCalculator.calculate(
                        RiskCalculatorInput(
                            equity=equity,
                            risk_percentage=config.risk_per_trade_pct,
                            entry_price=signal.entry_reference,
                            stop_price=signal.stop_reference,
                            target_price=signal.target_reference,
                            tick_size=config.tick_size,
                            lot_size=config.lot_size,
                            value_per_point=config.value_per_point,
                            brokerage_per_order=config.brokerage_per_order,
                            exchange_fee_pct=config.exchange_fee_pct,
                            tax_pct=config.tax_pct,
                            slippage_ticks=config.slippage_ticks,
                        )
                    )

                    if calc_res.is_valid and calc_res.executable_quantity > 0:
                        # Apply entry slippage
                        if signal.direction == "LONG":
                            actual_entry_p = signal.entry_reference + slippage_per_unit
                        else:
                            actual_entry_p = signal.entry_reference - slippage_per_unit

                        active_trade = {
                            "direction": signal.direction,
                            "entry_price": actual_entry_p,
                            "stop_price": signal.stop_reference,
                            "target_price": signal.target_reference,
                            "quantity": calc_res.executable_quantity,
                            "entry_time": curr_ts,
                            "holding_bars": 0,
                        }

            # Update Peak & Drawdowns
            if equity > peak_equity:
                peak_equity = equity

            current_dd_amt = peak_equity - equity
            current_dd_pct = (current_dd_amt / peak_equity) * 100.0 if peak_equity > 0 else 0.0

            if current_dd_amt > max_drawdown_amount:
                max_drawdown_amount = current_dd_amt
            if current_dd_pct > max_drawdown_pct:
                max_drawdown_pct = current_dd_pct

            equity_curve.append(
                EquityPoint(
                    time=curr_ts,
                    equity=round(equity, 2),
                    drawdown_pct=round(current_dd_pct, 2),
                    cash=round(cash, 2),
                    trades_count=len(closed_trades),
                )
            )

        # Performance Metrics Compilation
        total_trades = len(closed_trades)
        wins = [t for t in closed_trades if t.net_pnl > 0]
        losses = [t for t in closed_trades if t.net_pnl <= 0]
        win_count = len(wins)
        loss_count = len(losses)
        win_rate = (win_count / total_trades * 100.0) if total_trades > 0 else 0.0

        gross_profit = sum(t.net_pnl for t in wins)
        gross_loss = abs(sum(t.net_pnl for t in losses))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (99.0 if gross_profit > 0 else 0.0)

        expectancy = (sum(t.net_pnl for t in closed_trades) / total_trades) if total_trades > 0 else 0.0
        avg_holding = (sum(t.holding_bars for t in closed_trades) / total_trades) if total_trades > 0 else 0.0

        net_pnl = equity - config.initial_capital
        return_pct = (net_pnl / config.initial_capital) * 100.0

        # Benchmark Buy & Hold calculation
        first_c = float(candles[warmup_bars].close)
        last_c = float(candles[-1].close)
        buy_and_hold_pct = ((last_c - first_c) / first_c) * 100.0 if first_c > 0 else 0.0

        return BacktestSummary(
            symbol=config.symbol,
            timeframe=config.timeframe,
            initial_capital=round(config.initial_capital, 2),
            final_equity=round(equity, 2),
            net_pnl=round(net_pnl, 2),
            return_pct=round(return_pct, 2),
            buy_and_hold_return_pct=round(buy_and_hold_pct, 2),
            total_trades=total_trades,
            win_count=win_count,
            loss_count=loss_count,
            win_rate_pct=round(win_rate, 2),
            profit_factor=round(profit_factor, 2),
            expectancy=round(expectancy, 2),
            max_drawdown_amount=round(max_drawdown_amount, 2),
            max_drawdown_pct=round(max_drawdown_pct, 2),
            max_consecutive_losses=max_consecutive_losses,
            avg_holding_bars=round(avg_holding, 1),
            total_friction_paid=round(total_friction_sum, 2),
            trades=closed_trades,
            equity_curve=equity_curve,
        )
