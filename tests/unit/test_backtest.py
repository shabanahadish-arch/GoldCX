"""
Unit Tests for Backtesting Engine
"""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from data.candle_builder import CandleRecord
from data.csv_loader import CSVLoader
from engine.backtest import BacktestEngine, BacktestConfig


def test_backtest_execution_on_sample_data():
    # Generate 150 bars of synthetic 5m data with wave movement
    sample_csv = CSVLoader.generate_sample_csv(num_bars=150, base_price=500.0)
    candles, _ = CSVLoader.parse_csv(sample_csv)

    config = BacktestConfig(
        symbol="NIFTY",
        timeframe="5m",
        initial_capital=500000.0,
        risk_per_trade_pct=1.0,
        lot_size=50,
        value_per_point=1.0,
        brokerage_per_order=20.0,
        slippage_ticks=1,
    )

    summary = BacktestEngine.run(candles, config, warmup_bars=40)

    assert summary.symbol == "NIFTY"
    assert summary.initial_capital == 500000.0
    assert len(summary.equity_curve) > 0
    assert summary.max_drawdown_pct >= 0.0
    assert summary.total_friction_paid >= 0.0

    # Ensure every trade record has valid timestamps, prices, and net PnL accounting
    for trade in summary.trades:
        assert trade.entry_price > 0.0
        assert trade.exit_price > 0.0
        assert trade.quantity > 0
        assert trade.exit_reason in ("TARGET", "STOP", "INVALIDATION", "TIME_LIMIT")
        # Net PnL must be gross_pnl minus fees and slippage
        expected_net = trade.gross_pnl - trade.fees_and_taxes - trade.slippage_cost
        assert abs(trade.net_pnl - expected_net) < 0.05


def test_backtest_insufficient_data_error():
    sample_csv = CSVLoader.generate_sample_csv(num_bars=20)
    candles, _ = CSVLoader.parse_csv(sample_csv)

    config = BacktestConfig(symbol="TEST")
    with pytest.raises(ValueError) as exc:
        BacktestEngine.run(candles, config, warmup_bars=40)
    assert "Need at least" in str(exc.value)
