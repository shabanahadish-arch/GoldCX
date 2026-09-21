"""
Unit Tests for FastAPI Routes & Market Data Feeder
"""

import pytest
from datetime import datetime, timezone
from decimal import Decimal

from backend.market_store import MarketStore
from backend.routes.market import list_instruments
from backend.routes.calculator import calculate_position_size, PositionSizeRequest
from backend.routes.analysis import get_risk_analysis, get_signals
from backend.routes.paper import submit_paper_order, SubmitOrderRequest
from execution.portfolio import OrderSide


@pytest.mark.asyncio
async def test_market_instruments_list():
    instruments = await list_instruments()
    symbols = [inst.symbol for inst in instruments]
    assert "NIFTY" in symbols
    assert "BANKNIFTY" in symbols
    assert "BTCUSDT" in symbols


@pytest.mark.asyncio
async def test_calculator_endpoint_execution():
    req = PositionSizeRequest(
        equity=500000.0,
        risk_percentage=1.0,
        entry_price=22100.0,
        stop_price=22060.0,
        target_price=22200.0,
        lot_size=50,
    )
    res = await calculate_position_size(req)
    assert res["is_valid"] is True
    assert res["executable_quantity"] > 0
    assert res["max_allowable_risk"] == 5000.0
    assert res["breakeven_price"] > 22100.0


@pytest.mark.asyncio
async def test_risk_analysis_endpoint():
    res = await get_risk_analysis(symbol="NIFTY", timeframe="5m", higher_timeframe="1h")
    assert res["symbol"] == "NIFTY"
    assert len(res["dimensions"]) == 8
    assert "weighted_score" in res["composite_score"]
    assert "zone_id" in res["adaptive_zones"]
    assert "midpoint" in res["pivot_levels"]


@pytest.mark.asyncio
async def test_paper_order_submission_endpoint():
    req = SubmitOrderRequest(
        symbol="NIFTY",
        side="BUY",
        quantity=50,
        order_type="MARKET",
        stop_price=22000.0,
        target_price=22300.0,
    )
    res = await submit_paper_order(req)
    assert res["order_id"].startswith("ORD-")
    assert res["symbol"] == "NIFTY"
    assert res["status"] in ("FILLED", "REJECTED")
