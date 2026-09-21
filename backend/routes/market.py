"""
RiskPilot 8D - Market Data API Routes
Endpoints for instruments, historical candles, CSV upload, and manual/synthetic tick injection.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from backend.market_store import market_store
from backend.ws_manager import ws_manager
from data.csv_loader import CSVLoader

router = APIRouter(prefix="/api/v1/market", tags=["Market Data"])


class InstrumentInfo(BaseModel):
    symbol: str
    name: str
    asset_class: str
    lot_size: int
    tick_size: float
    value_per_point: float


@router.get("/instruments", response_model=List[InstrumentInfo])
async def list_instruments() -> List[InstrumentInfo]:
    """Returns available tradeable instruments with lot sizing and tick configuration."""
    return [
        InstrumentInfo(symbol="NIFTY", name="Nifty 50 Index", asset_class="INDEX", lot_size=50, tick_size=0.05, value_per_point=1.0),
        InstrumentInfo(symbol="BANKNIFTY", name="Bank Nifty Index", asset_class="INDEX", lot_size=15, tick_size=0.05, value_per_point=1.0),
        InstrumentInfo(symbol="RELIANCE", name="Reliance Industries", asset_class="EQUITY", lot_size=1, tick_size=0.05, value_per_point=1.0),
        InstrumentInfo(symbol="TCS", name="Tata Consultancy Services", asset_class="EQUITY", lot_size=1, tick_size=0.05, value_per_point=1.0),
        InstrumentInfo(symbol="BTCUSDT", name="Bitcoin / Tether", asset_class="CRYPTO", lot_size=1, tick_size=0.10, value_per_point=1.0),
    ]


@router.get("/candles")
async def get_candles(
    symbol: str = Query("NIFTY", description="Asset symbol"),
    timeframe: str = Query("5m", description="Bar timeframe e.g. 1m, 5m, 15m, 1h, 1d"),
    limit: int = Query(100, ge=1, le=1000, description="Max bars to return"),
) -> Dict[str, Any]:
    """Retrieves historical OHLCV candles."""
    candles = market_store.get_candles(symbol, timeframe, limit=limit)
    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "count": len(candles),
        "candles": [
            {
                "time": c.time.isoformat(),
                "open": float(c.open),
                "high": float(c.high),
                "low": float(c.low),
                "close": float(c.close),
                "volume": float(c.volume),
                "is_complete": c.is_complete,
            }
            for c in candles
        ],
    }


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    symbol: str = Form("CUSTOM"),
    timeframe: str = Form("5m"),
) -> Dict[str, Any]:
    """Uploads and parses a historical OHLCV CSV file."""
    try:
        content_bytes = await file.read()
        csv_text = content_bytes.decode("utf-8", errors="replace")
        candles, audit = CSVLoader.parse_csv(csv_text)
        
        # Save to in-memory cache
        market_store.add_csv_candles(symbol.upper(), timeframe, candles)

        return {
            "status": "success",
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "candles_parsed": len(candles),
            "audit": {
                "detected_columns": audit.detected_columns,
                "parsed_rows": audit.parsed_rows,
                "corrupt_rows": audit.corrupt_rows,
                "duplicate_rows": audit.duplicate_rows,
                "sample_rate_seconds": audit.sample_rate_seconds,
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV parsing failed: {str(e)}",
        )


class TickPayload(BaseModel):
    symbol: str
    timeframe: str = "5m"
    price: float
    volume: float = 10.0


@router.post("/tick")
async def inject_tick(payload: TickPayload) -> Dict[str, Any]:
    """Injects a real-time price tick and broadcasts to WebSocket clients."""
    candle = market_store.append_tick(
        symbol=payload.symbol,
        timeframe=payload.timeframe,
        price=payload.price,
        volume=payload.volume,
    )

    tick_msg = {
        "type": "TICK",
        "symbol": payload.symbol.upper(),
        "timeframe": payload.timeframe,
        "price": payload.price,
        "candle": {
            "time": candle.time.isoformat(),
            "open": float(candle.open),
            "high": float(candle.high),
            "low": float(candle.low),
            "close": float(candle.close),
            "volume": float(candle.volume),
        },
    }

    # Broadcast via WebSocket
    await ws_manager.broadcast_symbol(payload.symbol, tick_msg)

    return {"status": "ok", "candle": tick_msg["candle"]}
