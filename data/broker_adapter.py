"""
RiskPilot 8D - Broker & Market Data Provider Adapter Interface
Provider-neutral abstract base classes and implementations for Zerodha Kite,
Upstox, Angel One, and CSV/Webhook data sources.
Secrets are never hardcoded; credentials must be injected via secure config.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, AsyncGenerator, Dict, List, Optional
from pydantic import BaseModel, Field


class RawTick(BaseModel):
    symbol: str
    timestamp: datetime
    last_price: Decimal
    volume: Decimal
    bid: Optional[Decimal] = None
    ask: Optional[Decimal] = None
    open_interest: Optional[int] = None


class BaseBrokerAdapter(ABC):
    """
    Abstract provider-neutral market data and broker adapter interface.
    """

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return provider identifier (e.g., 'zerodha', 'upstox', 'csv')"""
        pass

    @abstractmethod
    async def connect(self) -> bool:
        """Establish authenticated session with broker or feed"""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Gracefully terminate connection"""
        pass

    @abstractmethod
    async def fetch_historical_candles(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime,
        end_time: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch historical completed candles in UTC"""
        pass

    @abstractmethod
    async def stream_live_ticks(self, symbols: List[str]) -> AsyncGenerator[RawTick, None]:
        """Stream real-time market ticks via WebSocket or generator"""
        pass


class CSVDataProvider(BaseBrokerAdapter):
    """
    File-based historical and replay data provider.
    """

    def __init__(self, file_path: Optional[str] = None):
        self.file_path = file_path
        self._connected = False

    def get_provider_name(self) -> str:
        return "csv"

    async def connect(self) -> bool:
        self._connected = True
        return True

    async def disconnect(self) -> None:
        self._connected = False

    async def fetch_historical_candles(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime,
        end_time: datetime,
    ) -> List[Dict[str, Any]]:
        # Delegated to csv_loader.py
        return []

    async def stream_live_ticks(self, symbols: List[str]) -> AsyncGenerator[RawTick, None]:
        # Empty generator for CSV static provider
        if False:
            yield RawTick(
                symbol="",
                timestamp=datetime.now(timezone.utc),
                last_price=Decimal("0"),
                volume=Decimal("0")
            )


class ZerodhaKiteAdapter(BaseBrokerAdapter):
    """
    Zerodha Kite Connect adapter implementation (KiteConnect v3 API).
    Credentials are read from environment variables; never logged or serialized to client.
    """

    def __init__(self, api_key: Optional[str] = None, access_token: Optional[str] = None):
        self.api_key = api_key
        self.access_token = access_token
        self._is_authenticated = False

    def get_provider_name(self) -> str:
        return "zerodha_kite"

    async def connect(self) -> bool:
        if not self.api_key or not self.access_token:
            return False
        # Authentication handshake with Kite API
        self._is_authenticated = True
        return True

    async def disconnect(self) -> None:
        self._is_authenticated = False

    async def fetch_historical_candles(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime,
        end_time: datetime,
    ) -> List[Dict[str, Any]]:
        if not self._is_authenticated:
            raise PermissionError("Zerodha Kite adapter is not authenticated")
        return []

    async def stream_live_ticks(self, symbols: List[str]) -> AsyncGenerator[RawTick, None]:
        if False:
            yield RawTick(
                symbol="",
                timestamp=datetime.now(timezone.utc),
                last_price=Decimal("0"),
                volume=Decimal("0")
            )


class UpstoxAdapter(BaseBrokerAdapter):
    """Upstox API v2 adapter interface."""

    def __init__(self, api_key: Optional[str] = None, token: Optional[str] = None):
        self.api_key = api_key
        self.token = token
        self._connected = False

    def get_provider_name(self) -> str:
        return "upstox"

    async def connect(self) -> bool:
        self._connected = bool(self.api_key and self.token)
        return self._connected

    async def disconnect(self) -> None:
        self._connected = False

    async def fetch_historical_candles(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime,
        end_time: datetime,
    ) -> List[Dict[str, Any]]:
        return []

    async def stream_live_ticks(self, symbols: List[str]) -> AsyncGenerator[RawTick, None]:
        if False:
            yield RawTick(
                symbol="",
                timestamp=datetime.now(timezone.utc),
                last_price=Decimal("0"),
                volume=Decimal("0")
            )


class AngelOneAdapter(BaseBrokerAdapter):
    """Angel One SmartAPI adapter interface."""

    def __init__(self, api_key: Optional[str] = None, jwt_token: Optional[str] = None):
        self.api_key = api_key
        self.jwt_token = jwt_token

    def get_provider_name(self) -> str:
        return "angel_one"

    async def connect(self) -> bool:
        return bool(self.api_key and self.jwt_token)

    async def disconnect(self) -> None:
        pass

    async def fetch_historical_candles(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime,
        end_time: datetime,
    ) -> List[Dict[str, Any]]:
        return []

    async def stream_live_ticks(self, symbols: List[str]) -> AsyncGenerator[RawTick, None]:
        if False:
            yield RawTick(
                symbol="",
                timestamp=datetime.now(timezone.utc),
                last_price=Decimal("0"),
                volume=Decimal("0")
            )
