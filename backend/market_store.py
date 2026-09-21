"""
RiskPilot 8D - In-Memory Market Store & Shared State
Provides fast candle access, sample data pre-seeding, CSV ingestion,
and shared paper trading state for the REST API and WebSocket streams.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import math
from typing import Dict, List, Optional
import random

from data.candle_builder import CandleRecord
from data.csv_loader import CSVLoader
from execution.portfolio import VirtualPortfolio
from execution.paper_trader import PaperTradingEngine, PaperTradingConfig


class MarketStore:
    """
    Central in-memory store for candles, active subscriptions, and the paper trading engine.
    """

    def __init__(self):
        # Symbol -> Timeframe -> List[CandleRecord]
        self._candle_cache: Dict[str, Dict[str, List[CandleRecord]]] = {}
        
        # Shared Paper Trading Engine and Portfolio
        self.portfolio = VirtualPortfolio(initial_capital=500000.0)
        self.paper_engine = PaperTradingEngine(portfolio=self.portfolio)

        # Pre-seed default instruments
        self._preseed_defaults()

    def _preseed_defaults(self) -> None:
        """Pre-seeds default symbols with realistic multi-bar price series."""
        symbols = [
            ("NIFTY", 22100.0, 0.05),
            ("BANKNIFTY", 46800.0, 0.05),
            ("RELIANCE", 2980.0, 0.05),
            ("TCS", 3920.0, 0.05),
            ("BTCUSDT", 64500.0, 0.1),
        ]
        timeframes = ["1m", "5m", "15m", "1h", "1d"]

        for sym, base_p, tick_sz in symbols:
            self._candle_cache[sym] = {}
            for tf in timeframes:
                # Generate 120 bars of synthetic data
                csv_data = CSVLoader.generate_sample_csv(
                    symbol=sym,
                    timeframe=tf,
                    num_bars=120,
                    base_price=base_p,
                )
                candles, _ = CSVLoader.parse_csv(csv_data)
                self._candle_cache[sym][tf] = candles

    def get_symbols(self) -> List[str]:
        return sorted(list(self._candle_cache.keys()))

    def get_candles(self, symbol: str, timeframe: str = "5m", limit: int = 100) -> List[CandleRecord]:
        sym_upper = symbol.upper()
        if sym_upper not in self._candle_cache:
            # If unknown symbol, initialize on the fly with 80 bars
            self._candle_cache[sym_upper] = {}
            for tf in ["1m", "5m", "15m", "1h", "1d"]:
                csv_data = CSVLoader.generate_sample_csv(
                    symbol=sym_upper,
                    timeframe=tf,
                    num_bars=80,
                    base_price=1000.0,
                )
                candles, _ = CSVLoader.parse_csv(csv_data)
                self._candle_cache[sym_upper][tf] = candles

        tf_data = self._candle_cache[sym_upper].get(timeframe)
        if not tf_data:
            # Generate fallback timeframe
            csv_data = CSVLoader.generate_sample_csv(
                symbol=sym_upper,
                timeframe=timeframe,
                num_bars=80,
                base_price=1000.0,
            )
            tf_data, _ = CSVLoader.parse_csv(csv_data)
            self._candle_cache[sym_upper][timeframe] = tf_data

        return tf_data[-limit:] if limit > 0 else tf_data

    def add_csv_candles(self, symbol: str, timeframe: str, candles: List[CandleRecord]) -> None:
        sym_upper = symbol.upper()
        if sym_upper not in self._candle_cache:
            self._candle_cache[sym_upper] = {}
        self._candle_cache[sym_upper][timeframe] = candles

    def append_tick(self, symbol: str, timeframe: str, price: float, volume: float = 10.0) -> CandleRecord:
        """
        Appends or updates the latest candle with a new tick price.
        """
        candles = self.get_candles(symbol, timeframe, limit=0)
        now = datetime.now(timezone.utc)

        if not candles:
            new_candle = CandleRecord(
                time=now,
                open=Decimal(str(price)),
                high=Decimal(str(price)),
                low=Decimal(str(price)),
                close=Decimal(str(price)),
                volume=Decimal(str(volume)),
                is_complete=False,
            )
            new_candle.symbol = symbol  # type: ignore
            candles.append(new_candle)
            return new_candle

        last_candle = candles[-1]
        p_dec = Decimal(str(price))
        # Update high/low/close
        if p_dec > last_candle.high:
            last_candle.high = p_dec
        if p_dec < last_candle.low:
            last_candle.low = p_dec
        last_candle.close = p_dec
        last_candle.volume += Decimal(str(volume))

        # Check paper trading order updates
        self.paper_engine.on_candle_update(last_candle)

        return last_candle


# Singleton market store instance
market_store = MarketStore()
