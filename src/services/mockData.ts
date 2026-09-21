/**
 * RiskPilot 8D - High-Fidelity Client Simulation & Fallback Service
 * Provides instant data generation for charts, pivots, zones, and 8D risk dimensions.
 */

import { Candle } from '../types';

export function generateSyntheticCandles(symbol: string, basePrice: number = 22100.0, count: number = 100): Candle[] {
  const candles: Candle[] = [];
  const nowSec = Math.floor(Date.now() / 1000);
  const intervalSec = 300; // 5m
  const startSec = nowSec - count * intervalSec;

  let currentClose = basePrice;
  let trend = 0.0002;

  for (let i = 0; i < count; i++) {
    const time = startSec + i * intervalSec;
    // Volatility between 0.1% and 0.4%
    const shock = (Math.sin(i / 7) * 0.0015) + ((Math.random() - 0.49) * 0.003) + trend;
    const open = currentClose;
    const close = Math.round((open * (1 + shock)) * 100) / 100;
    const range = Math.abs(close - open) + (open * 0.0015);
    const high = Math.round((Math.max(open, close) + range * Math.random()) * 100) / 100;
    const low = Math.round((Math.min(open, close) - range * Math.random()) * 100) / 100;
    const volume = Math.round(1500 + Math.random() * 4500);

    currentClose = close;
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
      isComplete: true,
    });
  }

  return candles;
}

export function computeMockPivots(candles: Candle[]) {
  if (!candles.length) return { midpoint: {}, camarilla: {}, classical: {} };
  const last = candles[candles.length - 1];
  const h = Math.max(...candles.slice(-20).map(c => c.high));
  const l = Math.min(...candles.slice(-20).map(c => c.low));
  const c = last.close;
  const range = h - l;

  return {
    midpoint: {
      pivot: Math.round(((h + l) / 2) * 100) / 100,
      r1: Math.round(((h + l) / 2 + range * 0.382) * 100) / 100,
      r2: Math.round(((h + l) / 2 + range * 0.618) * 100) / 100,
      s1: Math.round(((h + l) / 2 - range * 0.382) * 100) / 100,
      s2: Math.round(((h + l) / 2 - range * 0.618) * 100) / 100,
    },
    camarilla: {
      pivot: Math.round(c * 100) / 100,
      h4: Math.round((c + range * 1.1 / 2) * 100) / 100,
      h3: Math.round((c + range * 1.1 / 4) * 100) / 100,
      l3: Math.round((c - range * 1.1 / 4) * 100) / 100,
      l4: Math.round((c - range * 1.1 / 2) * 100) / 100,
    },
    classical: {
      pivot: Math.round(((h + l + c) / 3) * 100) / 100,
      r1: Math.round((2 * ((h + l + c) / 3) - l) * 100) / 100,
      s1: Math.round((2 * ((h + l + c) / 3) - h) * 100) / 100,
    }
  };
}

export function computeMockZones(candles: Candle[]) {
  if (!candles.length) return { zone_id: 4, zone_name: 'Zone 4: Midpoint Equilibrium', bias: 'NEUTRAL', action: 'WAIT', exhaustion_risk: 'LOW' };
  const last = candles[candles.length - 1];
  const h = Math.max(...candles.slice(-30).map(c => c.high));
  const l = Math.min(...candles.slice(-30).map(c => c.low));
  const posPct = ((last.close - l) / (h - l)) * 100;

  if (posPct > 85) {
    return { zone_id: 7, zone_name: 'Zone 7: Upper Reversal / Exhaustion', bias: 'BEARISH_EXHAUSTION', action: 'SHORT_PULLBACK', exhaustion_risk: 'HIGH' };
  } else if (posPct > 70) {
    return { zone_id: 6, zone_name: 'Zone 6: Bullish Momentum Continuation', bias: 'BULLISH', action: 'RIDE_TREND', exhaustion_risk: 'MEDIUM' };
  } else if (posPct > 55) {
    return { zone_id: 5, zone_name: 'Zone 5: Upper Value Expansion', bias: 'BULLISH_BIAS', action: 'LOOK_FOR_LONGS', exhaustion_risk: 'LOW' };
  } else if (posPct > 45) {
    return { zone_id: 4, zone_name: 'Zone 4: Fair Value Midpoint Equilibrium', bias: 'NEUTRAL', action: 'WAIT_FOR_BREAKOUT', exhaustion_risk: 'LOW' };
  } else if (posPct > 30) {
    return { zone_id: 3, zone_name: 'Zone 3: Lower Value Compression', bias: 'BEARISH_BIAS', action: 'LOOK_FOR_SHORTS', exhaustion_risk: 'LOW' };
  } else if (posPct > 15) {
    return { zone_id: 2, zone_name: 'Zone 2: Bearish Momentum Expansion', bias: 'BEARISH', action: 'RIDE_DOWNTREND', exhaustion_risk: 'MEDIUM' };
  } else {
    return { zone_id: 1, zone_name: 'Zone 1: Lower Reversal / Accumulation', bias: 'BULLISH_REVERSAL', action: 'LONG_ACCUMULATION', exhaustion_risk: 'HIGH' };
  }
}

export function computeMock8DMatrix(candles: Candle[]) {
  return [
    {
      dimension_index: 1,
      dimension_name: "Trend & Directional Bias",
      raw_score: 1.82,
      normalized_score: 0.68,
      confidence: 0.85,
      direction: "BULLISH",
      risk_level: "LOW",
      explanation: "Price is holding solidly above EMA20 and SuperTrend with ADX > 25 indicating strong directional momentum.",
      metrics: { ema20: 22120, ema50: 22070, adx: 28.4, supertrend_bias: 1 }
    },
    {
      dimension_index: 2,
      dimension_name: "Momentum & Velocity",
      raw_score: 14.5,
      normalized_score: 0.52,
      confidence: 0.80,
      direction: "BULLISH",
      risk_level: "LOW",
      explanation: "RSI is oscillating near 58.6 without bearish divergence. MACD histogram expanding in positive territory.",
      metrics: { rsi: 58.6, macd_hist: 4.2, stoch_k: 64.1 }
    },
    {
      dimension_index: 3,
      dimension_name: "Volatility & Expansion",
      raw_score: 0.94,
      normalized_score: -0.25,
      confidence: 0.78,
      direction: "NEUTRAL",
      risk_level: "MEDIUM",
      explanation: "Bollinger bandwidth is contracting mildly; ATR at 18.2 points implies manageable intra-bar volatility.",
      metrics: { atr: 18.2, bb_width: 0.014, historical_volatility: 13.8 }
    },
    {
      dimension_index: 4,
      dimension_name: "Volume & Participation",
      raw_score: 1.34,
      normalized_score: 0.44,
      confidence: 0.82,
      direction: "BULLISH",
      risk_level: "LOW",
      explanation: "Volume is 1.34x the 20-period moving average on bullish bars with positive On-Balance Volume flow.",
      metrics: { rvol: 1.34, obv_trend: "UPWARD", vwap_distance_pct: 0.28 }
    },
    {
      dimension_index: 5,
      dimension_name: "Market Structure & Key Levels",
      raw_score: 0.80,
      normalized_score: 0.60,
      confidence: 0.88,
      direction: "BULLISH",
      risk_level: "LOW",
      explanation: "Structure of higher-highs and higher-lows intact. Testing immediate resistance near Camarilla H3.",
      metrics: { structure: "HIGHER_HIGHS", nearest_support: 22080, nearest_resistance: 22180 }
    },
    {
      dimension_index: 6,
      dimension_name: "Order Flow & Institutional Footprint",
      raw_score: 0.55,
      normalized_score: 0.38,
      confidence: 0.72,
      direction: "BULLISH",
      risk_level: "LOW",
      explanation: "Cumulative Volume Delta (CVD) divergence favors buyers; aggressive market order absorption observed at support.",
      metrics: { cvd_slope: 0.42, delta_absorption: "BUYER_DEFENSE", vwap_confluence: true }
    },
    {
      dimension_index: 7,
      dimension_name: "Multi-Timeframe Alignment",
      raw_score: 0.70,
      normalized_score: 0.55,
      confidence: 0.86,
      direction: "BULLISH",
      risk_level: "LOW",
      explanation: "15m and 1h higher timeframes are aligned bullish above their respective 20-period moving averages.",
      metrics: { tf_15m_bias: "BULLISH", tf_1h_bias: "BULLISH", confluence_ratio: 0.80 }
    },
    {
      dimension_index: 8,
      dimension_name: "Macro & Regime Risk",
      raw_score: -0.15,
      normalized_score: -0.10,
      confidence: 0.75,
      direction: "NEUTRAL",
      risk_level: "MEDIUM",
      explanation: "Implied volatility index (VIX) stable at 13.6 with no scheduled high-impact central bank announcements today.",
      metrics: { vix: 13.6, news_event_risk: "NORMAL", regime: "TRENDING_NORMAL" }
    }
  ];
}
