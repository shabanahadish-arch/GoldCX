"""
RiskPilot 8D - Backtesting API Routes
Executes walk-forward simulations, equity curves, drawdown analysis, and trade audits.
"""

from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.market_store import market_store
from engine.backtest import BacktestEngine, BacktestConfig

router = APIRouter(prefix="/api/v1/backtest", tags=["Backtesting Engine"])


class BacktestRunRequest(BaseModel):
    symbol: str = Field("NIFTY", description="Asset symbol")
    timeframe: str = Field("5m", description="Bar timeframe")
    initial_capital: float = Field(500000.0, description="Initial virtual balance")
    risk_per_trade_pct: float = Field(1.0, description="Risk % per trade")
    lot_size: int = Field(50, description="Contract lot size")
    value_per_point: float = Field(1.0, description="Value per point move")
    tick_size: float = Field(0.05, description="Asset tick size")
    brokerage_per_order: float = Field(20.0, description="Broker fee per order")
    slippage_ticks: int = Field(2, description="Expected slippage in ticks")
    require_htf_alignment: bool = Field(False, description="Strict higher-timeframe confluence")
    max_holding_bars: int = Field(50, description="Max bars before time-based exit")
    target_rr_multiple: float = Field(2.0, description="Target reward-to-risk multiple")


@router.post("/run")
async def run_backtest(req: BacktestRunRequest) -> Dict[str, Any]:
    candles = market_store.get_candles(req.symbol, timeframe=req.timeframe, limit=200)

    if len(candles) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient historical data for {req.symbol} on {req.timeframe} (got {len(candles)} bars, need >= 50)",
        )

    config = BacktestConfig(
        symbol=req.symbol.upper(),
        timeframe=req.timeframe,
        initial_capital=req.initial_capital,
        risk_per_trade_pct=req.risk_per_trade_pct,
        lot_size=req.lot_size,
        value_per_point=req.value_per_point,
        tick_size=req.tick_size,
        brokerage_per_order=req.brokerage_per_order,
        slippage_ticks=req.slippage_ticks,
        require_htf_alignment=req.require_htf_alignment,
        max_holding_bars=req.max_holding_bars,
        target_rr_multiple=req.target_rr_multiple,
    )

    summary = BacktestEngine.run(candles, config, warmup_bars=40)

    return {
        "symbol": summary.symbol,
        "timeframe": summary.timeframe,
        "initial_capital": summary.initial_capital,
        "final_equity": summary.final_equity,
        "net_pnl": summary.net_pnl,
        "return_pct": summary.return_pct,
        "buy_and_hold_return_pct": summary.buy_and_hold_return_pct,
        "total_trades": summary.total_trades,
        "win_count": summary.win_count,
        "loss_count": summary.loss_count,
        "win_rate_pct": summary.win_rate_pct,
        "profit_factor": summary.profit_factor,
        "expectancy": summary.expectancy,
        "max_drawdown_amount": summary.max_drawdown_amount,
        "max_drawdown_pct": summary.max_drawdown_pct,
        "max_consecutive_losses": summary.max_consecutive_losses,
        "avg_holding_bars": summary.avg_holding_bars,
        "total_friction_paid": summary.total_friction_paid,
        "trades": [
            {
                "id": t.id,
                "direction": t.direction,
                "entry_time": t.entry_time.isoformat(),
                "exit_time": t.exit_time.isoformat(),
                "entry_price": t.entry_price,
                "exit_price": t.exit_price,
                "quantity": t.quantity,
                "gross_pnl": t.gross_pnl,
                "fees_and_taxes": t.fees_and_taxes,
                "slippage_cost": t.slippage_cost,
                "net_pnl": t.net_pnl,
                "return_pct": t.return_pct,
                "exit_reason": t.exit_reason,
                "holding_bars": t.holding_bars,
            }
            for t in summary.trades
        ],
        "equity_curve": [
            {
                "time": ep.time.isoformat(),
                "equity": ep.equity,
                "drawdown_pct": ep.drawdown_pct,
                "cash": ep.cash,
                "trades_count": ep.trades_count,
            }
            for ep in summary.equity_curve
        ],
    }
