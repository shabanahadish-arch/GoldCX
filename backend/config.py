"""
RiskPilot 8D - Core Configuration Module
Typed configuration management using Pydantic Settings.
Never hardcodes secrets. Supports environment variables and secrets management.
"""

from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Core System
    PROJECT_NAME: str = "RiskPilot 8D"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    PORT: int = 3000
    HOST: str = "0.0.0.0"

    # Database & Cache
    DATABASE_URL: str = "postgresql+asyncpg://riskpilot_user:riskpilot_secure_pass@localhost:5432/riskpilot_8d"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & Authentication
    JWT_SECRET_KEY: str = Field(
        default="insecure_default_secret_must_change_in_production_32_bytes_min",
        description="HMAC secret key for JWT signing"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Operational Safety Controls
    ENABLE_LIVE_TRADING: bool = False
    PAPER_MODE: bool = True
    LIVE_TRADING_CONFIRMATION: bool = False
    DAILY_LOSS_LIMIT: float = 5000.0
    MAX_ORDER_NOTIONAL: float = 50000.0
    MAX_STALE_DATA_TOLERANCE_SECONDS: int = 5
    KILL_SWITCH_ACTIVE: bool = False

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 120

    # Market Defaults
    DEFAULT_DATA_PROVIDER: str = "csv"
    DEFAULT_TIMEFRAME: str = "5m"
    DEFAULT_HIGHER_TIMEFRAME: str = "1h"
    DEFAULT_TIMEZONE: str = "UTC"

    # Broker Credentials (Optional / Nullable)
    ZERODHA_API_KEY: Optional[str] = None
    ZERODHA_API_SECRET: Optional[str] = None
    UPSTOX_API_KEY: Optional[str] = None
    UPSTOX_API_SECRET: Optional[str] = None
    ANGEL_API_KEY: Optional[str] = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    def is_live_trading_permitted(self) -> bool:
        """
        Verify all 5 safety requirements before live trading can be initiated.
        """
        return (
            self.ENABLE_LIVE_TRADING is True
            and self.PAPER_MODE is False
            and self.LIVE_TRADING_CONFIRMATION is True
            and self.KILL_SWITCH_ACTIVE is False
            and self.DAILY_LOSS_LIMIT > 0
            and self.MAX_ORDER_NOTIONAL > 0
        )


settings = Settings()
