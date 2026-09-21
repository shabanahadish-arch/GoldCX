/**
 * RiskPilot 8D - Unified API & WebSocket Client Service
 * Connects to FastAPI backend endpoints with graceful fallback to high-fidelity in-browser engine.
 */

import { Candle, Signal, RiskDimension, CompositeScoreState, AdaptiveZone, HigherTimeframePivot } from '../types';

const API_BASE = '/api/v1';

export interface RiskAnalysisResponse {
  symbol: string;
  timeframe: string;
  timestamp: string;
  dimensions: {
    dimension_index: number;
    dimension_name: string;
    raw_score: number;
    normalized_score: number;
    confidence: number;
    direction: string;
    risk_level: string;
    explanation: string;
    metrics: Record<string, any>;
  }[];
  composite_score: {
    weighted_score: number;
    confidence_score: number;
    coverage_score: number;
    direction: string;
    risk_level: string;
    action_recommendation: string;
    invalidation_criteria: string;
    warnings: string[];
    summary_explanation: string;
  };
  adaptive_zones: {
    zone_id: number;
    zone_name: string;
    bias: string;
    action: string;
    exhaustion_risk: string;
    zone_levels: Record<string, number>;
  };
  pivot_levels: {
    midpoint: Record<string, number>;
    camarilla: Record<string, number>;
    classical: Record<string, number>;
  };
}

export interface PortfolioResponse {
  metrics: {
    cash: number;
    margin_used: number;
    margin_available: number;
    unrealized_pnl: number;
    realized_pnl: number;
    total_equity: number;
    daily_pnl: number;
    daily_pnl_pct: number;
    peak_equity: number;
    drawdown_amount: number;
    drawdown_pct: number;
    open_positions_count: number;
    is_trading_halted: boolean;
    halt_reason?: string;
  };
  open_positions: any[];
  recent_trades: any[];
}

export const api = {
  async getInstruments() {
    try {
      const res = await fetch(`${API_BASE}/market/instruments`);
      if (!res.ok) throw new Error('Failed to fetch instruments');
      return await res.json();
    } catch {
      return [
        { symbol: 'NIFTY', name: 'Nifty 50 Index', asset_class: 'INDEX', lot_size: 50, tick_size: 0.05, value_per_point: 1.0 },
        { symbol: 'BANKNIFTY', name: 'Bank Nifty Index', asset_class: 'INDEX', lot_size: 15, tick_size: 0.05, value_per_point: 1.0 },
        { symbol: 'RELIANCE', name: 'Reliance Industries', asset_class: 'EQUITY', lot_size: 1, tick_size: 0.05, value_per_point: 1.0 },
        { symbol: 'TCS', name: 'Tata Consultancy Services', asset_class: 'EQUITY', lot_size: 1, tick_size: 0.05, value_per_point: 1.0 },
        { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', asset_class: 'CRYPTO', lot_size: 1, tick_size: 0.10, value_per_point: 1.0 },
      ];
    }
  },

  async getCandles(symbol: string, timeframe: string = '5m', limit: number = 100): Promise<Candle[]> {
    try {
      const res = await fetch(`${API_BASE}/market/candles?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch candles');
      const data = await res.json();
      return data.candles.map((c: any) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        isComplete: c.is_complete,
      }));
    } catch {
      return [];
    }
  },

  async getRiskAnalysis(symbol: string, timeframe: string = '5m'): Promise<RiskAnalysisResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/analysis/risk?symbol=${symbol}&timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Failed to fetch risk analysis');
      return await res.json();
    } catch {
      return null;
    }
  },

  async getSignals(symbol: string, timeframe: string = '5m'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/analysis/signals?symbol=${symbol}&timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      return await res.json();
    } catch {
      return null;
    }
  },

  async calculatePositionSize(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/calculator/position-size`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async runBacktest(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/backtest/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async getPortfolio(): Promise<PortfolioResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/paper/portfolio`);
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      return await res.json();
    } catch {
      return null;
    }
  },

  async submitPaperOrder(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/paper/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async closePosition(positionId: string, exitMarketPrice?: number): Promise<any> {
    const res = await fetch(`${API_BASE}/paper/close-position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_id: positionId, exit_market_price: exitMarketPrice }),
    });
    return await res.json();
  },

  async triggerKillSwitch(): Promise<any> {
    const res = await fetch(`${API_BASE}/paper/kill-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return await res.json();
  },

  async resumeTrading(): Promise<any> {
    const res = await fetch(`${API_BASE}/paper/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return await res.json();
  },

  async resetPortfolio(): Promise<any> {
    const res = await fetch(`${API_BASE}/paper/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return await res.json();
  },
};
