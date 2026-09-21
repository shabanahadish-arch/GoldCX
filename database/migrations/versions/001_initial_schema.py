"""Initial database schema for RiskPilot 8D

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-20 20:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.String(32), nullable=False, server_default='ANALYST'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('live_trading_permission', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('daily_loss_limit', sa.Numeric(14, 2), nullable=False, server_default='5000.00'),
        sa.Column('max_order_notional', sa.Numeric(14, 2), nullable=False, server_default='50000.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # 2. Instruments table
    op.create_table(
        'instruments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('symbol', sa.String(64), nullable=False, unique=True),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('asset_class', sa.String(32), nullable=False, server_default='EQUITY'),
        sa.Column('tick_size', sa.Numeric(10, 4), nullable=False, server_default='0.05'),
        sa.Column('lot_size', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('value_per_point', sa.Numeric(10, 4), nullable=False, server_default='1.0'),
        sa.Column('currency', sa.String(8), nullable=False, server_default='USD'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_instruments_symbol', 'instruments', ['symbol'])

    # 3. Candles table
    op.create_table(
        'candles',
        sa.Column('time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('symbol', sa.String(64), nullable=False),
        sa.Column('timeframe', sa.String(16), nullable=False),
        sa.Column('open', sa.Numeric(14, 4), nullable=False),
        sa.Column('high', sa.Numeric(14, 4), nullable=False),
        sa.Column('low', sa.Numeric(14, 4), nullable=False),
        sa.Column('close', sa.Numeric(14, 4), nullable=False),
        sa.Column('volume', sa.Numeric(18, 4), nullable=False),
        sa.Column('trades_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_complete', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('symbol', 'timeframe', 'time')
    )
    op.create_index('idx_candles_lookup', 'candles', ['symbol', 'timeframe', 'time'])

    # Optionally convert to TimescaleDB hypertable if extension exists
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
                PERFORM create_hypertable('candles', 'time', if_not_exists => TRUE);
            END IF;
        END$$;
        """
    )

    # 4. Market Events table
    op.create_table(
        'market_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('symbol_or_market', sa.String(64), nullable=False),
        sa.Column('event_name', sa.String(128), nullable=False),
        sa.Column('impact_level', sa.String(16), nullable=False, server_default='MEDIUM'),
        sa.Column('scheduled_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('blackout_minutes_before', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('blackout_minutes_after', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_market_events_symbol', 'market_events', ['symbol_or_market'])
    op.create_index('ix_market_events_time', 'market_events', ['scheduled_time'])

    # 5. Risk Dimension Snapshots table
    op.create_table(
        'risk_dimension_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('symbol', sa.String(64), nullable=False),
        sa.Column('timeframe', sa.String(16), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('dim1_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('dim1_dir', sa.String(16), nullable=True),
        sa.Column('dim1_risk', sa.String(16), nullable=True),
        sa.Column('dim1_conf', sa.Numeric(4, 3), nullable=True),
        sa.Column('dim1_expl', sa.Text(), nullable=True),
        sa.Column('dim2_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('dim2_dir', sa.String(16), nullable=True),
        sa.Column('dim2_risk', sa.String(16), nullable=True),
        sa.Column('dim2_conf', sa.Numeric(4, 3), nullable=True),
        sa.Column('dim2_expl', sa.Text(), nullable=True),
        sa.Column('dim3_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('dim3_dir', sa.String(16), nullable=True),
        sa.Column('dim3_risk', sa.String(16), nullable=True),
        sa.Column('dim3_conf', sa.Numeric(4, 3), nullable=True),
        sa.Column('dim3_expl', sa.Text(), nullable=True),
        sa.Column('dim4_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('dim4_dir', sa.String(16), nullable=True),
        sa.Column('dim4_risk', sa.String(16), nullable=True),
        sa.Column('dim4_conf', sa.Numeric(4, 3), nullable=True),
        sa.Column('dim4_expl', sa.Text(), nullable=True),
        sa.Column('dim5_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('dim5_dir', sa.String(16), nullable=True),
        sa.Column('dim5_risk', sa.String(16), nullable=True),
        sa.Column('dim5_conf', sa.Numeric(4, 3), nullable=True),
        sa.Column('dim5_expl', sa.Text(), nullable=True),
        sa.Column('dim6_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('dim6_dir', sa.String(16), nullable=True),
        sa.Column('dim6_risk', sa.String(16), nullable=True),
        sa.Column('dim6_conf', sa.Numeric(4, 3), nullable=True),
        sa.Column('dim6_expl', sa.Text(), nullable=True),
        sa.Column('dim7_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('dim7_dir', sa.String(16), nullable=True),
        sa.Column('dim7_risk', sa.String(16), nullable=True),
        sa.Column('dim7_conf', sa.Numeric(4, 3), nullable=True),
        sa.Column('dim7_expl', sa.Text(), nullable=True),
        sa.Column('dim8_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('dim8_dir', sa.String(16), nullable=True),
        sa.Column('dim8_risk', sa.String(16), nullable=True),
        sa.Column('dim8_conf', sa.Numeric(4, 3), nullable=True),
        sa.Column('dim8_expl', sa.Text(), nullable=True),
        sa.Column('features_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
    )
    op.create_index('idx_risk_snapshots_lookup', 'risk_dimension_snapshots', ['symbol', 'timeframe', 'timestamp'])

    # 6. Composite Scores table
    op.create_table(
        'composite_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('symbol', sa.String(64), nullable=False),
        sa.Column('timeframe', sa.String(16), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('weighted_score', sa.Numeric(6, 2), nullable=False),
        sa.Column('confidence_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('coverage_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('direction', sa.String(16), nullable=False),
        sa.Column('risk_level', sa.String(16), nullable=False),
        sa.Column('action_recommendation', sa.String(32), nullable=False),
        sa.Column('invalidation_criteria', sa.Text(), nullable=True),
        sa.Column('warnings', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('summary_explanation', sa.Text(), nullable=True)
    )
    op.create_index('idx_composite_scores_lookup', 'composite_scores', ['symbol', 'timeframe', 'timestamp'])

    # 7. Trading Signals table
    op.create_table(
        'trading_signals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('signal_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('symbol', sa.String(64), nullable=False),
        sa.Column('timeframe', sa.String(16), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('direction', sa.String(16), nullable=False),
        sa.Column('entry_reference', sa.Numeric(14, 4), nullable=False),
        sa.Column('stop_reference', sa.Numeric(14, 4), nullable=False),
        sa.Column('target_reference', sa.Numeric(14, 4), nullable=False),
        sa.Column('risk_reward_ratio', sa.Numeric(6, 2), nullable=False),
        sa.Column('composite_score', sa.Numeric(6, 2), nullable=False),
        sa.Column('confidence', sa.Numeric(5, 2), nullable=False),
        sa.Column('risk_level', sa.String(16), nullable=False),
        sa.Column('reasons', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('invalidation_condition', sa.Text(), nullable=False),
        sa.Column('data_quality_state', sa.String(32), nullable=False, server_default='VALID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_trading_signals_symbol', 'trading_signals', ['symbol'])

    # 8. Paper Orders table
    op.create_table(
        'paper_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('symbol', sa.String(64), nullable=False),
        sa.Column('order_type', sa.String(16), nullable=False, server_default='MARKET'),
        sa.Column('side', sa.String(8), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('limit_price', sa.Numeric(14, 4), nullable=True),
        sa.Column('stop_price', sa.Numeric(14, 4), nullable=True),
        sa.Column('executed_price', sa.Numeric(14, 4), nullable=True),
        sa.Column('status', sa.String(16), nullable=False, server_default='CREATED'),
        sa.Column('estimated_fees', sa.Numeric(10, 2), nullable=False, server_default='0.00'),
        sa.Column('estimated_slippage', sa.Numeric(10, 4), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_paper_orders_symbol', 'paper_orders', ['symbol'])

    # 9. Backtest Runs table
    op.create_table(
        'backtest_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('symbol', sa.String(64), nullable=False),
        sa.Column('timeframe', sa.String(16), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('initial_capital', sa.Numeric(14, 2), nullable=False),
        sa.Column('final_equity', sa.Numeric(14, 2), nullable=False),
        sa.Column('metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('equity_curve', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )

    # 10. Audit Logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_type', sa.String(64), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_audit_logs_event_type', 'audit_logs', ['event_type'])
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'])


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('backtest_runs')
    op.drop_table('paper_orders')
    op.drop_table('trading_signals')
    op.drop_table('composite_scores')
    op.drop_table('risk_dimension_snapshots')
    op.drop_table('market_events')
    op.drop_table('candles')
    op.drop_table('instruments')
    op.drop_table('users')
