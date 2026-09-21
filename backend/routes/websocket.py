"""
RiskPilot 8D - Real-Time Streaming WebSocket Route
Streams live candles, ticks, 8D risk updates, and signal alerts to connected clients.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.market_store import market_store
from backend.ws_manager import ws_manager
from engine.dimension_orchestrator import DimensionOrchestrator

router = APIRouter(tags=["WebSocket Streaming"])
logger = logging.getLogger("riskpilot.ws")


@router.websocket("/ws/stream/{symbol}")
async def websocket_stream_endpoint(websocket: WebSocket, symbol: str):
    """
    WebSocket endpoint for real-time market data, risk scores, and execution events.
    """
    sym = symbol.upper()
    await ws_manager.connect(websocket, sym)

    try:
        # 1. Send initial state snapshot upon connection
        candles = market_store.get_candles(sym, timeframe="5m", limit=35)
        if len(candles) >= 30:
            analysis = DimensionOrchestrator.analyze(
                symbol=sym,
                timeframe="5m",
                candles=candles,
            )
            initial_msg = {
                "type": "INITIAL_STATE",
                "symbol": sym,
                "latest_candle": {
                    "time": candles[-1].time.isoformat(),
                    "open": float(candles[-1].open),
                    "high": float(candles[-1].high),
                    "low": float(candles[-1].low),
                    "close": float(candles[-1].close),
                    "volume": float(candles[-1].volume),
                },
                "composite_score": {
                    "score": analysis.composite_score.weighted_score,
                    "direction": analysis.composite_score.direction,
                    "risk_level": analysis.composite_score.risk_level,
                    "action": analysis.composite_score.action_recommendation,
                },
                "adaptive_zone": {
                    "zone_id": analysis.adaptive_zones.zone_id,
                    "zone_name": analysis.adaptive_zones.zone_name,
                },
            }
            await websocket.send_json(initial_msg)

        # 2. Keep listening for client commands (heartbeats, subscribe, etc.)
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                action = msg.get("action")
                if action == "ping":
                    await websocket.send_json({"type": "PONG", "timestamp": datetime.now(timezone.utc).isoformat()})
                elif action == "subscribe":
                    new_sym = msg.get("symbol", sym).upper()
                    if new_sym != sym:
                        ws_manager.disconnect(websocket, sym)
                        sym = new_sym
                        await ws_manager.connect(websocket, sym)
                        await websocket.send_json({"type": "SUBSCRIBED", "symbol": sym})
            except Exception:
                pass

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, sym)
    except Exception as e:
        ws_manager.disconnect(websocket, sym)
