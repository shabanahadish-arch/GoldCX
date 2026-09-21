"""
RiskPilot 8D - WebSocket Connection Manager & Broadcast Dispatcher
Handles real-time client subscriptions, streaming ticks, risk score updates, and signal alerts.
"""

import asyncio
from datetime import datetime, timezone
import json
from typing import Dict, List, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # symbol -> set of active WebSockets
        self._active_connections: Dict[str, Set[WebSocket]] = {}
        # global clients receiving all updates
        self._all_clients: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, symbol: str = "NIFTY") -> None:
        await websocket.accept()
        sym = symbol.upper()
        if sym not in self._active_connections:
            self._active_connections[sym] = set()
        self._active_connections[sym].add(websocket)
        self._all_clients.add(websocket)

    def disconnect(self, websocket: WebSocket, symbol: str = "NIFTY") -> None:
        sym = symbol.upper()
        if sym in self._active_connections and websocket in self._active_connections[sym]:
            self._active_connections[sym].remove(websocket)
        if websocket in self._all_clients:
            self._all_clients.remove(websocket)

    async def broadcast_symbol(self, symbol: str, message: dict) -> None:
        sym = symbol.upper()
        if sym not in self._active_connections:
            return

        dead_connections: List[WebSocket] = []
        for ws in self._active_connections[sym]:
            try:
                await ws.send_json(message)
            except Exception:
                dead_connections.append(ws)

        for ws in dead_connections:
            self.disconnect(ws, sym)

    async def broadcast_global(self, message: dict) -> None:
        dead_connections: List[WebSocket] = []
        for ws in self._all_clients:
            try:
                await ws.send_json(message)
            except Exception:
                dead_connections.append(ws)

        for ws in dead_connections:
            if ws in self._all_clients:
                self._all_clients.remove(ws)


ws_manager = ConnectionManager()
