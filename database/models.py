"""
RiskPilot 8D - Database Models (SQLAlchemy 2.0)
TimescaleDB compatible schema for candles, 8D risk matrices, composite scores,
signals, paper trading orders, and audit logs.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.session import Base


# ==============================================================================
# 1. User & Authentication
# ==============================================================================
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="ANALYST", nullable=False) # ANALYST, TRADER, ADMIN
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Safety Gate Permissions
    live_trading_permission: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    daily_loss_limit: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=5000.00, nullable=False)
    max_order_notional: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=50000.00, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    paper_orders = relationship("PaperOrder", back_populates="user")
    backtests = relationship("BacktestRun", back_populates="user")


# ==============================================================================
# 2. Market Instruments
# ==============================================================================
class Instrument(Base):
    __tablename__ = "instruments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    symbol: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    asset_class: Mapped[str] = mapped_column(String(32), default="EQUITY", nullable=False) # EQUITY, INDEX, FUTURES, FX, COMMODITY
    tick_size: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=0.05, nullable=False)
    lot_size: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    value_per_point: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=1.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ==============================================================================
# 3. Market Candles (TimescaleDB Compatible Hypertable)
# ==============================================================================
class Candle(Base):
    __tablename__ = "candles"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True, nullable=False)
    symbol: Mapped[str] = mapped_column(String(64), primary_key=True, nullable=False)
    timeframe: Mapped[str] = mapped_column(String(16), primary_key=True, nullable=False) # 1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d
    
    open: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    volume: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    trades_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("idx_candles_lookup", "symbol", "timeframe", "time", postgresql_using="btree"),
    )


# ==============================================================================
# 4. Market Events & Blackout Windows
# ==============================================================================
class MarketEvent(Base):
    __tablename__ = "market_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    symbol_or_market: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    event_name: Mapped[str] = mapped_column(String(128), nullable=False)
    impact_level: Mapped[str] = mapped_column(String(16), default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    scheduled_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    blackout_minutes_before: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    blackout_minutes_after: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ==============================================================================
# 5. 8D Risk Dimension Snapshots
# ==============================================================================
class RiskDimensionSnapshot(Base):
    __tablename__ = "risk_dimension_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    symbol: Mapped[str] = mapped_column(String(64), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(16), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Dim 1: Zone Location Risk
    dim1_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    dim1_dir: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim1_risk: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim1_conf: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3), nullable=True)
    dim1_expl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dim 2: Time and Regime Risk
    dim2_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    dim2_dir: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim2_risk: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim2_conf: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3), nullable=True)
    dim2_expl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dim 3: Trend Health Risk
    dim3_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    dim3_dir: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim3_risk: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim3_conf: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3), nullable=True)
    dim3_expl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dim 4: Price Action Perception Risk
    dim4_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    dim4_dir: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim4_risk: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim4_conf: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3), nullable=True)
    dim4_expl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dim 5: Sudden Movement Risk
    dim5_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    dim5_dir: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim5_risk: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim5_conf: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3), nullable=True)
    dim5_expl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dim 6: Conditional Confirmation Risk
    dim6_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    dim6_dir: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim6_risk: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim6_conf: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3), nullable=True)
    dim6_expl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dim 7: Event Risk
    dim7_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    dim7_dir: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim7_risk: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim7_conf: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3), nullable=True)
    dim7_expl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dim 8: Family and Market-Context Risk
    dim8_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    dim8_dir: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim8_risk: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    dim8_conf: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3), nullable=True)
    dim8_expl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    features_payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (
        Index("idx_risk_snapshots_lookup", "symbol", "timeframe", "timestamp", postgresql_using="btree"),
    )


# ==============================================================================
# 6. Composite Scores
# ==============================================================================
class CompositeScore(Base):
    __tablename__ = "composite_scores"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    symbol: Mapped[str] = mapped_column(String(64), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(16), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    weighted_score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False) # [-100.0, +100.0]
    confidence_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False) # [0.0, 100.0]
    coverage_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False) # [0.0, 100.0]
    
    direction: Mapped[str] = mapped_column(String(16), nullable=False) # BULLISH, BEARISH, NEUTRAL, UNAVAILABLE
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False) # LOW, MEDIUM, HIGH, UNAVAILABLE
    action_recommendation: Mapped[str] = mapped_column(String(32), nullable=False) # LONG_BIAS, SHORT_BIAS, WAIT, BLOCKED
    
    invalidation_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    warnings: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    summary_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_composite_scores_lookup", "symbol", "timeframe", "timestamp", postgresql_using="btree"),
    )


# ==============================================================================
# 7. Decision-Support Signals
# ==============================================================================
class TradingSignal(Base):
    __tablename__ = "trading_signals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    signal_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    timeframe: Mapped[str] = mapped_column(String(16), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    direction: Mapped[str] = mapped_column(String(16), nullable=False) # LONG, SHORT, EXIT
    entry_reference: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    stop_reference: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    target_reference: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    risk_reward_ratio: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    
    composite_score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    
    reasons: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    invalidation_condition: Mapped[str] = mapped_column(Text, nullable=False)
    data_quality_state: Mapped[str] = mapped_column(String(32), default="VALID", nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ==============================================================================
# 8. Paper Trading Orders
# ==============================================================================
class PaperOrder(Base):
    __tablename__ = "paper_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    symbol: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    order_type: Mapped[str] = mapped_column(String(16), default="MARKET", nullable=False) # MARKET, LIMIT, STOP
    side: Mapped[str] = mapped_column(String(8), nullable=False) # BUY, SELL
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    
    limit_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    stop_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    executed_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    
    status: Mapped[str] = mapped_column(
        String(16), default="CREATED", nullable=False
    ) # CREATED, ACCEPTED, PARTIAL, FILLED, CANCELLED, REJECTED, CLOSED
    
    estimated_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    estimated_slippage: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=0.0, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", back_populates="paper_orders")


# ==============================================================================
# 9. Backtest Execution Runs
# ==============================================================================
class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    symbol: Mapped[str] = mapped_column(String(64), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(16), nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    initial_capital: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    final_equity: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    
    metrics: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    equity_curve: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="backtests")


# ==============================================================================
# 10. Audit Log & Security Events
# ==============================================================================
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    details: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
