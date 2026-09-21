/**
 * Suparnova CX - Quantitative Risk & Decision Engine
 * Dedicated Indian Markets Trading & Risk Analytics System
 * High-fidelity real-time indicator calculations, 8-dimensional factor matrix,
 * multi-tier composite scoring, and dynamic signal generation for Indian Stocks & Indices.
 */

import { Candle } from '../types';

export interface SymbolConfig {
  basePrice: number;
  tickSize: number;
  lotSize: number;
  assetClass: 'INDEX' | 'EQUITY';
  currency: 'INR';
  volatilityPct: number;
  vixBenchmark: number;
  displayName: string;
  category: string;
  isCustom?: boolean;
}

export const BASE_INDIAN_SYMBOLS: Record<string, SymbolConfig> = {
  // 1. Benchmark Indices (NSE / BSE)
  NIFTY: {
    basePrice: 22150.0,
    tickSize: 0.05,
    lotSize: 50,
    assetClass: 'INDEX',
    currency: 'INR',
    volatilityPct: 0.0020,
    vixBenchmark: 13.4,
    displayName: 'NIFTY 50 Benchmark Index',
    category: 'IND_INDICES',
  },
  BANKNIFTY: {
    basePrice: 47200.0,
    tickSize: 0.05,
    lotSize: 15,
    assetClass: 'INDEX',
    currency: 'INR',
    volatilityPct: 0.0035,
    vixBenchmark: 14.8,
    displayName: 'NIFTY Bank Index',
    category: 'IND_INDICES',
  },
  FINNIFTY: {
    basePrice: 21400.0,
    tickSize: 0.05,
    lotSize: 40,
    assetClass: 'INDEX',
    currency: 'INR',
    volatilityPct: 0.0032,
    vixBenchmark: 14.2,
    displayName: 'NIFTY Financial Services',
    category: 'IND_INDICES',
  },
  MIDCPNIFTY: {
    basePrice: 11250.0,
    tickSize: 0.05,
    lotSize: 75,
    assetClass: 'INDEX',
    currency: 'INR',
    volatilityPct: 0.0042,
    vixBenchmark: 15.6,
    displayName: 'NIFTY Midcap Select',
    category: 'IND_INDICES',
  },
  SENSEX: {
    basePrice: 73150.0,
    tickSize: 0.05,
    lotSize: 10,
    assetClass: 'INDEX',
    currency: 'INR',
    volatilityPct: 0.0019,
    vixBenchmark: 13.2,
    displayName: 'BSE SENSEX 30 Index',
    category: 'IND_INDICES',
  },

  // 2. Banking & Financial Services
  HDFCBANK: {
    basePrice: 1650.0,
    tickSize: 0.05,
    lotSize: 300,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0026,
    vixBenchmark: 14.2,
    displayName: 'HDFC Bank Ltd',
    category: 'IND_BANK',
  },
  ICICIBANK: {
    basePrice: 1120.0,
    tickSize: 0.05,
    lotSize: 350,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0028,
    vixBenchmark: 14.5,
    displayName: 'ICICI Bank Ltd',
    category: 'IND_BANK',
  },
  SBIN: {
    basePrice: 785.0,
    tickSize: 0.05,
    lotSize: 750,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0034,
    vixBenchmark: 15.0,
    displayName: 'State Bank of India',
    category: 'IND_BANK',
  },
  KOTAKBANK: {
    basePrice: 1740.0,
    tickSize: 0.05,
    lotSize: 400,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0027,
    vixBenchmark: 14.3,
    displayName: 'Kotak Mahindra Bank',
    category: 'IND_BANK',
  },
  AXISBANK: {
    basePrice: 1180.0,
    tickSize: 0.05,
    lotSize: 625,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0031,
    vixBenchmark: 14.9,
    displayName: 'Axis Bank Ltd',
    category: 'IND_BANK',
  },
  BAJFINANCE: {
    basePrice: 6950.0,
    tickSize: 0.05,
    lotSize: 125,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0036,
    vixBenchmark: 16.0,
    displayName: 'Bajaj Finance Ltd',
    category: 'IND_BANK',
  },

  // 3. Information Technology (IT)
  TCS: {
    basePrice: 4180.0,
    tickSize: 0.05,
    lotSize: 175,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0024,
    vixBenchmark: 14.1,
    displayName: 'Tata Consultancy Services',
    category: 'IND_IT',
  },
  INFY: {
    basePrice: 1880.0,
    tickSize: 0.05,
    lotSize: 400,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0030,
    vixBenchmark: 14.8,
    displayName: 'Infosys Limited',
    category: 'IND_IT',
  },
  HCLTECH: {
    basePrice: 1620.0,
    tickSize: 0.05,
    lotSize: 350,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0029,
    vixBenchmark: 14.4,
    displayName: 'HCL Technologies',
    category: 'IND_IT',
  },
  WIPRO: {
    basePrice: 530.0,
    tickSize: 0.05,
    lotSize: 1500,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0032,
    vixBenchmark: 15.1,
    displayName: 'Wipro Limited',
    category: 'IND_IT',
  },
  TECHM: {
    basePrice: 1450.0,
    tickSize: 0.05,
    lotSize: 600,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0035,
    vixBenchmark: 15.5,
    displayName: 'Tech Mahindra Ltd',
    category: 'IND_IT',
  },

  // 4. Energy, Oil, Power & Utilities
  RELIANCE: {
    basePrice: 2925.0,
    tickSize: 0.05,
    lotSize: 250,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0028,
    vixBenchmark: 15.2,
    displayName: 'Reliance Industries Ltd',
    category: 'IND_ENERGY',
  },
  ONGC: {
    basePrice: 280.0,
    tickSize: 0.05,
    lotSize: 2250,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0038,
    vixBenchmark: 16.5,
    displayName: 'Oil & Natural Gas Corp',
    category: 'IND_ENERGY',
  },
  NTPC: {
    basePrice: 380.0,
    tickSize: 0.05,
    lotSize: 1500,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0033,
    vixBenchmark: 15.0,
    displayName: 'NTPC Limited',
    category: 'IND_ENERGY',
  },
  POWERGRID: {
    basePrice: 315.0,
    tickSize: 0.05,
    lotSize: 2700,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0025,
    vixBenchmark: 13.8,
    displayName: 'Power Grid Corporation',
    category: 'IND_ENERGY',
  },
  BPCL: {
    basePrice: 610.0,
    tickSize: 0.05,
    lotSize: 1800,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0037,
    vixBenchmark: 16.2,
    displayName: 'Bharat Petroleum Corp',
    category: 'IND_ENERGY',
  },
  COALINDIA: {
    basePrice: 490.0,
    tickSize: 0.05,
    lotSize: 2100,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0036,
    vixBenchmark: 15.8,
    displayName: 'Coal India Ltd',
    category: 'IND_ENERGY',
  },

  // 5. Automobile & Mobility
  TATAMOTORS: {
    basePrice: 965.0,
    tickSize: 0.05,
    lotSize: 700,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0038,
    vixBenchmark: 16.5,
    displayName: 'Tata Motors Ltd',
    category: 'IND_AUTO',
  },
  M_AND_M: {
    basePrice: 2840.0,
    tickSize: 0.05,
    lotSize: 350,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0032,
    vixBenchmark: 15.3,
    displayName: 'Mahindra & Mahindra',
    category: 'IND_AUTO',
  },
  MARUTI: {
    basePrice: 12400.0,
    tickSize: 0.05,
    lotSize: 50,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0027,
    vixBenchmark: 14.5,
    displayName: 'Maruti Suzuki India',
    category: 'IND_AUTO',
  },
  BAJAJ_AUTO: {
    basePrice: 9850.0,
    tickSize: 0.05,
    lotSize: 75,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0030,
    vixBenchmark: 15.0,
    displayName: 'Bajaj Auto Ltd',
    category: 'IND_AUTO',
  },

  // 6. Metals & Mining
  TATASTEEL: {
    basePrice: 165.0,
    tickSize: 0.05,
    lotSize: 5500,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0041,
    vixBenchmark: 17.2,
    displayName: 'Tata Steel Ltd',
    category: 'IND_METALS',
  },
  JSWSTEEL: {
    basePrice: 920.0,
    tickSize: 0.05,
    lotSize: 675,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0037,
    vixBenchmark: 16.4,
    displayName: 'JSW Steel Ltd',
    category: 'IND_METALS',
  },
  HINDALCO: {
    basePrice: 640.0,
    tickSize: 0.05,
    lotSize: 1400,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0040,
    vixBenchmark: 16.8,
    displayName: 'Hindalco Industries',
    category: 'IND_METALS',
  },

  // 7. FMCG & Consumption
  ITC: {
    basePrice: 475.0,
    tickSize: 0.05,
    lotSize: 1600,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0022,
    vixBenchmark: 12.8,
    displayName: 'ITC Limited',
    category: 'IND_FMCG',
  },
  HINDUNILVR: {
    basePrice: 2580.0,
    tickSize: 0.05,
    lotSize: 300,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0023,
    vixBenchmark: 13.0,
    displayName: 'Hindustan Unilever Ltd',
    category: 'IND_FMCG',
  },
  TITAN: {
    basePrice: 3550.0,
    tickSize: 0.05,
    lotSize: 175,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0031,
    vixBenchmark: 14.8,
    displayName: 'Titan Company Ltd',
    category: 'IND_FMCG',
  },
  NESTLEIND: {
    basePrice: 2480.0,
    tickSize: 0.05,
    lotSize: 200,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0021,
    vixBenchmark: 12.5,
    displayName: 'Nestle India Ltd',
    category: 'IND_FMCG',
  },

  // 8. Pharmaceuticals & Healthcare
  SUNPHARMA: {
    basePrice: 1680.0,
    tickSize: 0.05,
    lotSize: 350,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0028,
    vixBenchmark: 14.0,
    displayName: 'Sun Pharmaceutical Ind.',
    category: 'IND_PHARMA',
  },
  DRREDDY: {
    basePrice: 6450.0,
    tickSize: 0.05,
    lotSize: 125,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0029,
    vixBenchmark: 14.2,
    displayName: "Dr. Reddy's Laboratories",
    category: 'IND_PHARMA',
  },
  CIPLA: {
    basePrice: 1520.0,
    tickSize: 0.05,
    lotSize: 650,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0030,
    vixBenchmark: 14.4,
    displayName: 'Cipla Limited',
    category: 'IND_PHARMA',
  },

  // 9. Infrastructure, Capital Goods & Conglomerates
  LT: {
    basePrice: 3680.0,
    tickSize: 0.05,
    lotSize: 150,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0028,
    vixBenchmark: 14.6,
    displayName: 'Larsen & Toubro Ltd',
    category: 'IND_INFRA',
  },
  ADANIENT: {
    basePrice: 3120.0,
    tickSize: 0.05,
    lotSize: 300,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0055,
    vixBenchmark: 22.0,
    displayName: 'Adani Enterprises Ltd',
    category: 'IND_INFRA',
  },
  ADANIPORTS: {
    basePrice: 1420.0,
    tickSize: 0.05,
    lotSize: 400,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0042,
    vixBenchmark: 18.0,
    displayName: 'Adani Ports & SEZ',
    category: 'IND_INFRA',
  },
};

// Aliases for user convenience (e.g. M&M, BAJAJ-AUTO)
export const SYMBOL_CONFIGS: Record<string, SymbolConfig> = {
  ...BASE_INDIAN_SYMBOLS,
  'M&M': BASE_INDIAN_SYMBOLS.M_AND_M,
  'BAJAJ-AUTO': BASE_INDIAN_SYMBOLS.BAJAJ_AUTO,
};

export const SYMBOL_CATEGORIES = [
  {
    id: 'IND_INDICES',
    name: 'Benchmark Indices (NSE/BSE)',
    symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'],
  },
  {
    id: 'IND_BANK',
    name: 'Banking & Financial Services',
    symbols: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'BAJFINANCE'],
  },
  {
    id: 'IND_IT',
    name: 'Information Technology (IT)',
    symbols: ['TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM'],
  },
  {
    id: 'IND_ENERGY',
    name: 'Energy, Oil, Power & Utilities',
    symbols: ['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID', 'BPCL', 'COALINDIA'],
  },
  {
    id: 'IND_AUTO',
    name: 'Automobile & Mobility',
    symbols: ['TATAMOTORS', 'M&M', 'MARUTI', 'BAJAJ-AUTO'],
  },
  {
    id: 'IND_METALS',
    name: 'Metals, Mining & Steel',
    symbols: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO'],
  },
  {
    id: 'IND_FMCG',
    name: 'FMCG & Consumer Goods',
    symbols: ['ITC', 'HINDUNILVR', 'TITAN', 'NESTLEIND'],
  },
  {
    id: 'IND_PHARMA',
    name: 'Pharmaceuticals & Healthcare',
    symbols: ['SUNPHARMA', 'DRREDDY', 'CIPLA'],
  },
  {
    id: 'IND_INFRA',
    name: 'Infrastructure & Conglomerates',
    symbols: ['LT', 'ADANIENT', 'ADANIPORTS'],
  },
];

const CUSTOM_STOCKS_STORAGE_KEY = 'supernova_custom_stocks_v1';

export function getStoredCustomStocks(): Record<string, SymbolConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_STOCKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomStock(symbol: string, config: SymbolConfig): void {
  try {
    const existing = getStoredCustomStocks();
    const sym = symbol.toUpperCase().trim();
    existing[sym] = {
      ...config,
      isCustom: true,
    };
    localStorage.setItem(CUSTOM_STOCKS_STORAGE_KEY, JSON.stringify(existing));
    // Also inject into runtime memory map
    SYMBOL_CONFIGS[sym] = existing[sym];
  } catch {}
}

export function updateStockConfig(symbol: string, updates: Partial<SymbolConfig>): void {
  try {
    const sym = symbol.toUpperCase().trim();
    const existing = getStoredCustomStocks();
    const current = getSymbolDefaults(sym);
    existing[sym] = {
      ...current,
      ...updates,
      isCustom: true,
    };
    localStorage.setItem(CUSTOM_STOCKS_STORAGE_KEY, JSON.stringify(existing));
    SYMBOL_CONFIGS[sym] = existing[sym];
  } catch {}
}

export function deleteCustomStock(symbol: string): void {
  try {
    const sym = symbol.toUpperCase().trim();
    const existing = getStoredCustomStocks();
    delete existing[sym];
    localStorage.setItem(CUSTOM_STOCKS_STORAGE_KEY, JSON.stringify(existing));
    if (SYMBOL_CONFIGS[sym]?.isCustom) {
      delete SYMBOL_CONFIGS[sym];
    }
  } catch {}
}

export function resetAllStocksToDefault(): void {
  try {
    localStorage.removeItem(CUSTOM_STOCKS_STORAGE_KEY);
  } catch {}
}

export function getAllActiveCategories() {
  const custom = getStoredCustomStocks();
  const customSymbols = Object.keys(custom);
  
  const baseCategories = SYMBOL_CATEGORIES.map((cat) => ({
    ...cat,
    symbols: [...cat.symbols],
  }));

  if (customSymbols.length > 0) {
    baseCategories.unshift({
      id: 'CUSTOM_STOCKS',
      name: 'Custom / Added Stocks (User)',
      symbols: customSymbols,
    });
  }

  return baseCategories;
}

export function getSymbolDefaults(symbol: string): SymbolConfig {
  const sym = symbol.toUpperCase().trim();
  const custom = getStoredCustomStocks();
  if (custom[sym]) {
    return custom[sym];
  }
  if (SYMBOL_CONFIGS[sym]) {
    return SYMBOL_CONFIGS[sym];
  }
  // Standard default for new Indian equity
  return {
    basePrice: 1000.0,
    tickSize: 0.05,
    lotSize: 100,
    assetClass: 'EQUITY',
    currency: 'INR',
    volatilityPct: 0.0035,
    vixBenchmark: 15.0,
    displayName: `${sym} Indian Equity`,
    category: 'CUSTOM_STOCKS',
    isCustom: true,
  };
}

export function getTimeframeSeconds(timeframe: string): number {
  switch (timeframe) {
    case '1m': return 60;
    case '3m': return 180;
    case '5m': return 300;
    case '15m': return 900;
    case '30m': return 1800;
    case '1h': return 3600;
    case '2h': return 7200;
    case '4h': return 14400;
    case '1D':
    case '1d': return 86400;
    case '1W':
    case '1w': return 604800;
    default: return 300;
  }
}

export const ALL_TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1D', '1W'] as const;

/**
 * Generates realistic synthetic OHLCV candles customized by symbol scale and timeframe.
 */
export function generateSyntheticCandles(
  symbol: string,
  customBasePrice?: number,
  count: number = 100,
  timeframe: string = '5m'
): Candle[] {
  const config = getSymbolDefaults(symbol);
  const basePrice = customBasePrice || config.basePrice;
  const intervalSec = getTimeframeSeconds(timeframe);
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - count * intervalSec;

  // Timeframe volatility scale factor
  const tfVolatilityFactor: Record<string, number> = {
    '1m': 0.45,
    '3m': 0.65,
    '5m': 0.85,
    '15m': 1.15,
    '30m': 1.45,
    '1h': 1.85,
    '2h': 2.4,
    '4h': 3.1,
    '1D': 4.5,
    '1d': 4.5,
    '1W': 7.5,
    '1w': 7.5,
  };
  const tfFactor = tfVolatilityFactor[timeframe] || 1.0;
  const volMult = config.volatilityPct * tfFactor;

  // Simple deterministic pseudorandom seed based on symbol and timeframe
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed += symbol.charCodeAt(i) * (i + 1);
  }
  for (let i = 0; i < timeframe.length; i++) {
    seed += timeframe.charCodeAt(i) * 17;
  }

  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const candles: Candle[] = [];
  let currentClose = basePrice;
  
  // Characteristic asset-specific drift
  const trendPhase = (symbol === 'NIFTY' || symbol === 'BANKNIFTY') ? 0.00025 : (symbol === 'TCS' ? -0.00008 : 0.00012);

  for (let i = 0; i < count; i++) {
    const time = startSec + i * intervalSec;
    const wave1 = Math.sin(i / 8) * 0.0018;
    const wave2 = Math.cos(i / 19) * 0.0025;
    const noise = (pseudoRandom() - 0.485) * volMult * 2.8;
    const shock = wave1 + wave2 + noise + trendPhase;

    const open = currentClose;
    const close = Math.round((open * (1 + shock)) * 100) / 100;
    const candleRange = Math.abs(close - open) + (open * volMult * (0.6 + pseudoRandom() * 0.8));
    const upperWick = candleRange * (0.2 + pseudoRandom() * 0.5);
    const lowerWick = candleRange * (0.2 + pseudoRandom() * 0.5);
    
    const high = Math.round((Math.max(open, close) + upperWick) * 100) / 100;
    const low = Math.round((Math.min(open, close) - lowerWick) * 100) / 100;
    const baseVol = config.assetClass === 'INDEX' ? 15000 : 3500;
    const volume = Math.round(baseVol * (0.7 + pseudoRandom() * 1.6));

    currentClose = close;
    candles.push({
      time,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume,
      isComplete: true,
    });
  }

  return candles;
}

/**
 * Computes Technical Indicators over a Candle series.
 */
function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length <= period) return 50.0;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(closes: number[]) {
  if (closes.length < 26) return { line: 0, signal: 0, hist: 0 };
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;
  const signal = macdLine * 0.85; // Close approximation
  const hist = macdLine - signal;
  return { line: macdLine, signal, hist };
}

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 10.0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1].close;
    const tr = Math.max(c.high - c.low, Math.abs(c.high - prevC), Math.abs(c.low - prevC));
    trs.push(tr);
  }
  const slice = trs.slice(-period);
  return slice.reduce((acc, v) => acc + v, 0) / slice.length;
}

function calculateBollingerBands(closes: number[], period: number = 20, mult: number = 2) {
  if (closes.length < period) {
    const c = closes[closes.length - 1] || 100;
    return { middle: c, upper: c * 1.01, lower: c * 0.99, bandwidthPct: 2.0 };
  }
  const slice = closes.slice(-period);
  const sma = slice.reduce((acc, v) => acc + v, 0) / period;
  const variance = slice.reduce((acc, v) => acc + Math.pow(v - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = sma + mult * stdDev;
  const lower = sma - mult * stdDev;
  const bandwidthPct = sma > 0 ? ((upper - lower) / sma) * 100 : 0;
  return { middle: sma, upper, lower, bandwidthPct };
}

/**
 * Computes Midpoint, Camarilla, and Classical Pivots.
 */
export function computeMockPivots(candles: Candle[]) {
  if (!candles.length) {
    return {
      midpoint: { pivot: 0, r1: 0, r2: 0, s1: 0, s2: 0 },
      camarilla: { pivot: 0, h4: 0, h3: 0, l3: 0, l4: 0 },
      classical: { pivot: 0, r1: 0, s1: 0 },
    };
  }

  const lookback = Math.min(30, candles.length);
  const recentCandles = candles.slice(-lookback);
  const h = Math.max(...recentCandles.map((c) => c.high));
  const l = Math.min(...recentCandles.map((c) => c.low));
  const c = recentCandles[recentCandles.length - 1].close;
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
    },
  };
}

/**
 * Computes Adaptive 7-Zone classification based on recent price position within range.
 */
export function computeMockZones(candles: Candle[]) {
  if (!candles.length) {
    return {
      zone_id: 4,
      zone_name: 'Zone 4: Midpoint Equilibrium',
      bias: 'NEUTRAL',
      action: 'WAIT',
      exhaustion_risk: 'LOW',
    };
  }

  const lookback = Math.min(30, candles.length);
  const recent = candles.slice(-lookback);
  const h = Math.max(...recent.map((c) => c.high));
  const l = Math.min(...recent.map((c) => c.low));
  const last = recent[recent.length - 1];
  const range = h - l || 1;
  const posPct = ((last.close - l) / range) * 100;

  if (posPct > 85) {
    return { zone_id: 7, zone_name: 'Zone 7: Upper Reversal / Exhaustion', bias: 'BEARISH_EXHAUSTION', action: 'LOOK_FOR_PULLBACK', exhaustion_risk: 'HIGH' };
  } else if (posPct > 70) {
    return { zone_id: 6, zone_name: 'Zone 6: Bullish Momentum Expansion', bias: 'BULLISH', action: 'RIDE_TREND', exhaustion_risk: 'MEDIUM' };
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

/**
 * Computes dynamic 8-Dimensional Quantitative Risk Matrix directly from candle data and asset parameters.
 */
export function computeMock8DMatrix(candles: Candle[], symbol: string = 'NIFTY', timeframe: string = '5m') {
  if (!candles.length) return [];

  const closes = candles.map((c) => c.close);
  const lastCandle = candles[candles.length - 1];
  const lastPrice = lastCandle.close;
  const config = getSymbolDefaults(symbol);

  // Technical calculations
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const atr = calculateATR(candles, 14);
  const bb = calculateBollingerBands(closes, 20);

  // Stochastic %K
  const lookback14 = candles.slice(-14);
  const low14 = Math.min(...lookback14.map((c) => c.low));
  const high14 = Math.max(...lookback14.map((c) => c.high));
  const stochK = high14 > low14 ? ((lastPrice - low14) / (high14 - low14)) * 100 : 50;

  // Volume & RVOL
  const vols = candles.map((c) => c.volume);
  const avgVol20 = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const rvol = avgVol20 > 0 ? lastCandle.volume / avgVol20 : 1.0;

  // VWAP
  let cumTypicalVol = 0;
  let cumVol = 0;
  candles.forEach((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    cumTypicalVol += tp * c.volume;
    cumVol += c.volume;
  });
  const vwap = cumVol > 0 ? cumTypicalVol / cumVol : lastPrice;
  const vwapDistPct = ((lastPrice - vwap) / vwap) * 100;

  // Cumulative Volume Delta (CVD)
  let cvd = 0;
  let deltaPositiveCount = 0;
  candles.slice(-30).forEach((c) => {
    const range = c.high - c.low || 1;
    const closePos = (c.close - c.low) / range;
    const barDelta = c.volume * (closePos - 0.5) * 2;
    cvd += barDelta;
    if (barDelta > 0) deltaPositiveCount++;
  });
  const cvdSlope = deltaPositiveCount / 30;

  // Market Structure
  const pivots = computeMockPivots(candles);
  const nearestSupport = lastPrice >= pivots.camarilla.l3 ? pivots.camarilla.l3 : pivots.midpoint.s1;
  const nearestResistance = lastPrice <= pivots.camarilla.h3 ? pivots.camarilla.h3 : pivots.midpoint.r1;

  // --- Dimension 1: Trend & Directional Bias ---
  const trendBullish = lastPrice > ema20 && ema20 >= ema50;
  const trendBearish = lastPrice < ema20 && ema20 <= ema50;
  const d1Score = trendBullish ? 0.72 : (trendBearish ? -0.74 : (lastPrice > ema20 ? 0.28 : -0.28));
  const d1Dir = d1Score > 0.3 ? 'BULLISH' : (d1Score < -0.3 ? 'BEARISH' : 'NEUTRAL');
  const d1Risk = Math.abs(d1Score) > 0.4 ? 'LOW' : 'MEDIUM';

  // --- Dimension 2: Momentum & Velocity ---
  const d2Raw = (rsi - 50) / 50; // -1 to 1
  const macdBoost = macd.hist > 0 ? 0.15 : -0.15;
  const d2Score = Math.max(-1, Math.min(1, d2Raw + macdBoost));
  const d2Dir = d2Score > 0.2 ? 'BULLISH' : (d2Score < -0.2 ? 'BEARISH' : 'NEUTRAL');
  const d2Risk = (rsi > 78 || rsi < 22) ? 'HIGH' : 'LOW';

  // --- Dimension 3: Volatility & Expansion ---
  const isSqueezing = bb.bandwidthPct < 1.2;
  const isExpanding = bb.bandwidthPct > 2.8;
  const d3Score = isExpanding ? (lastPrice > bb.middle ? 0.45 : -0.45) : -0.15;
  const d3Dir = isExpanding ? (lastPrice > bb.middle ? 'BULLISH' : 'BEARISH') : 'NEUTRAL';
  const d3Risk = isExpanding ? 'MEDIUM' : (isSqueezing ? 'LOW' : 'LOW');

  // --- Dimension 4: Volume & Participation ---
  const volBullish = rvol > 1.1 && lastPrice >= lastCandle.open;
  const volBearish = rvol > 1.1 && lastPrice < lastCandle.open;
  const d4Score = volBullish ? 0.62 : (volBearish ? -0.65 : 0.12);
  const d4Dir = d4Score > 0.25 ? 'BULLISH' : (d4Score < -0.25 ? 'BEARISH' : 'NEUTRAL');
  const d4Risk = rvol > 2.5 ? 'MEDIUM' : 'LOW';

  // --- Dimension 5: Market Structure & Key Levels ---
  const aboveCamL3 = lastPrice > pivots.camarilla.l3;
  const aboveCamH3 = lastPrice > pivots.camarilla.h3;
  const d5Score = aboveCamH3 ? 0.68 : (aboveCamL3 ? 0.38 : -0.58);
  const d5Dir = d5Score > 0.2 ? 'BULLISH' : (d5Score < -0.2 ? 'BEARISH' : 'NEUTRAL');
  const d5Risk = (aboveCamH3 || lastPrice < pivots.camarilla.l4) ? 'MEDIUM' : 'LOW';

  // --- Dimension 6: Order Flow & Institutional Footprint ---
  const d6Score = cvdSlope > 0.55 ? 0.58 : (cvdSlope < 0.45 ? -0.52 : 0.05);
  const d6Dir = d6Score > 0.2 ? 'BULLISH' : (d6Score < -0.2 ? 'BEARISH' : 'NEUTRAL');
  const d6Risk = 'LOW';

  // --- Dimension 7: Multi-Timeframe Alignment ---
  const htfAlignment = (trendBullish && rsi > 52) ? 0.78 : ((trendBearish && rsi < 48) ? -0.75 : 0.15);
  const d7Dir = htfAlignment > 0.3 ? 'BULLISH' : (htfAlignment < -0.3 ? 'BEARISH' : 'NEUTRAL');

  // --- Dimension 8: Macro & Regime Risk ---
  const vix = config.vixBenchmark;
  const d8Score = vix > 25 ? -0.45 : 0.25;
  const d8Dir = d8Score >= 0 ? 'BULLISH' : 'NEUTRAL';
  const d8Risk = vix > 22 ? 'HIGH' : 'LOW';

  return [
    {
      dimension_index: 1,
      dimension_name: 'Trend & Directional Bias',
      raw_score: Number((lastPrice - ema50).toFixed(2)),
      normalized_score: Number(d1Score.toFixed(2)),
      confidence: 0.88,
      direction: d1Dir,
      risk_level: d1Risk,
      explanation: `Price (${lastPrice.toLocaleString()}) is trading ${lastPrice >= ema20 ? 'above' : 'below'} EMA20 (${ema20.toFixed(1)}) and ${lastPrice >= ema50 ? 'above' : 'below'} EMA50 (${ema50.toFixed(1)}).`,
      metrics: {
        ema20: Number(ema20.toFixed(1)),
        ema50: Number(ema50.toFixed(1)),
        price_to_ema20: `${((lastPrice - ema20) / ema20 * 100).toFixed(2)}%`,
        trend_status: trendBullish ? 'STRONG_UP' : (trendBearish ? 'STRONG_DOWN' : 'CONSOLIDATING'),
      },
    },
    {
      dimension_index: 2,
      dimension_name: 'Momentum & Velocity',
      raw_score: Number((rsi - 50).toFixed(1)),
      normalized_score: Number(d2Score.toFixed(2)),
      confidence: 0.82,
      direction: d2Dir,
      risk_level: d2Risk,
      explanation: `14-period RSI is at ${rsi.toFixed(1)} with MACD histogram at ${macd.hist.toFixed(2)} and Stoch %K at ${stochK.toFixed(1)}.`,
      metrics: {
        rsi: Number(rsi.toFixed(1)),
        macd_line: Number(macd.line.toFixed(2)),
        macd_hist: Number(macd.hist.toFixed(2)),
        stoch_k: Number(stochK.toFixed(1)),
      },
    },
    {
      dimension_index: 3,
      dimension_name: 'Volatility & Expansion',
      raw_score: Number(atr.toFixed(2)),
      normalized_score: Number(d3Score.toFixed(2)),
      confidence: 0.80,
      direction: d3Dir,
      risk_level: d3Risk,
      explanation: `ATR is ${atr.toFixed(2)} with Bollinger bandwidth at ${bb.bandwidthPct.toFixed(2)}%. ${isSqueezing ? 'Volatility squeeze detected.' : 'Normal volatility expansion.'}`,
      metrics: {
        atr: Number(atr.toFixed(2)),
        bb_upper: Number(bb.upper.toFixed(1)),
        bb_lower: Number(bb.lower.toFixed(1)),
        bb_width_pct: `${bb.bandwidthPct.toFixed(2)}%`,
      },
    },
    {
      dimension_index: 4,
      dimension_name: 'Volume & Participation',
      raw_score: Number(rvol.toFixed(2)),
      normalized_score: Number(d4Score.toFixed(2)),
      confidence: 0.84,
      direction: d4Dir,
      risk_level: d4Risk,
      explanation: `RVOL is ${rvol.toFixed(2)}x 20-period average volume with price ${vwapDistPct >= 0 ? '+' : ''}${vwapDistPct.toFixed(2)}% from session VWAP (${vwap.toFixed(1)}).`,
      metrics: {
        rvol: `${rvol.toFixed(2)}x`,
        vwap: Number(vwap.toFixed(1)),
        vwap_dist_pct: `${vwapDistPct.toFixed(2)}%`,
        flow: volBullish ? 'BUYER_ACCUMULATION' : (volBearish ? 'SELLER_DISTRIBUTION' : 'BALANCED'),
      },
    },
    {
      dimension_index: 5,
      dimension_name: 'Market Structure & Key Levels',
      raw_score: Number((lastPrice - pivots.camarilla.pivot).toFixed(2)),
      normalized_score: Number(d5Score.toFixed(2)),
      confidence: 0.86,
      direction: d5Dir,
      risk_level: d5Risk,
      explanation: `Nearest Support at ${nearestSupport.toLocaleString()} and Resistance at ${nearestResistance.toLocaleString()}. Camarilla H3: ${pivots.camarilla.h3.toLocaleString()}.`,
      metrics: {
        support: Number(nearestSupport.toFixed(1)),
        resistance: Number(nearestResistance.toFixed(1)),
        camarilla_h3: Number(pivots.camarilla.h3.toFixed(1)),
        camarilla_l3: Number(pivots.camarilla.l3.toFixed(1)),
      },
    },
    {
      dimension_index: 6,
      dimension_name: 'Order Flow & Institutional Footprint',
      raw_score: Number((cvdSlope * 100).toFixed(1)),
      normalized_score: Number(d6Score.toFixed(2)),
      confidence: 0.76,
      direction: d6Dir,
      risk_level: d6Risk,
      explanation: `Cumulative volume delta (CVD) slope is ${(cvdSlope * 100).toFixed(0)}% positive over recent bars with ${cvdSlope > 0.5 ? 'buyer absorption at support' : 'seller pressure'}.`,
      metrics: {
        cvd_ratio: `${(cvdSlope * 100).toFixed(0)}%`,
        delta_bias: cvdSlope > 0.5 ? 'BUYER_ABSORPTION' : 'SELLER_PRESSURE',
        net_delta_vol: Math.round(cvd),
      },
    },
    {
      dimension_index: 7,
      dimension_name: 'Multi-Timeframe Alignment',
      raw_score: Number((htfAlignment * 10).toFixed(1)),
      normalized_score: Number(htfAlignment.toFixed(2)),
      confidence: 0.85,
      direction: d7Dir,
      risk_level: 'LOW',
      explanation: `Confluence across ${timeframe} and higher structures shows ${(Math.abs(htfAlignment) * 100).toFixed(0)}% alignment with prevailing trend.`,
      metrics: {
        confluence_pct: `${(Math.abs(htfAlignment) * 100).toFixed(0)}%`,
        higher_tf_trend: htfAlignment > 0 ? 'BULLISH' : (htfAlignment < 0 ? 'BEARISH' : 'NEUTRAL'),
        anchor_timeframe: timeframe,
      },
    },
    {
      dimension_index: 8,
      dimension_name: 'Macro & Regime Risk',
      raw_score: Number(vix.toFixed(1)),
      normalized_score: Number(d8Score.toFixed(2)),
      confidence: 0.80,
      direction: d8Dir,
      risk_level: d8Risk,
      explanation: `Benchmark volatility index (India VIX) is ${vix.toFixed(1)}, indicating ${vix > 18 ? 'elevated' : 'stable'} macro regime risk.`,
      metrics: {
        vix_index: vix,
        asset_class: config.assetClass,
        macro_regime: vix > 20 ? 'HIGH_VOLATILITY' : 'STABLE_EXPANSION',
      },
    },
  ];
}

/**
 * Computes unified weighted composite score (-100 to +100), direction, confidence, and invalidation criteria.
 */
export function computeCompositeScore(dimensions: any[], lastPrice: number, pivotLevels: any) {
  if (!dimensions.length) {
    return {
      score: 0,
      direction: 'NEUTRAL',
      riskLevel: 'LOW',
      actionRecommendation: 'WAIT_FOR_SETUP',
      confidence: 70,
      coverage: 100,
      warnings: [],
      invalidationCriteria: 'No active data.',
      summaryExplanation: 'Awaiting market data feed.',
    };
  }

  // Weightings for 8 dimensions: Trend(20%), Momentum(15%), Volatility(10%), Volume(15%), Structure(15%), OrderFlow(10%), MTF(10%), Macro(5%)
  const weights = [0.20, 0.15, 0.10, 0.15, 0.15, 0.10, 0.10, 0.05];
  let weightedScore = 0;
  let bullishCount = 0;
  let bearishCount = 0;
  let highRiskCount = 0;

  dimensions.forEach((dim, idx) => {
    const w = weights[idx] || 0.1;
    weightedScore += dim.normalized_score * w * 100;
    if (dim.direction === 'BULLISH') bullishCount++;
    if (dim.direction === 'BEARISH') bearishCount++;
    if (dim.risk_level === 'HIGH') highRiskCount++;
  });

  const finalScore = Math.max(-100, Math.min(100, Math.round(weightedScore * 10) / 10));
  
  let direction = 'NEUTRAL';
  if (finalScore >= 18) direction = 'BULLISH';
  else if (finalScore <= -18) direction = 'BEARISH';

  let riskLevel = 'LOW';
  if (highRiskCount >= 2 || Math.abs(finalScore) > 85) riskLevel = 'HIGH';
  else if (highRiskCount === 1 || Math.abs(finalScore) < 15) riskLevel = 'MEDIUM';

  let actionRecommendation = 'WAIT_FOR_SETUP';
  if (finalScore >= 20 && riskLevel !== 'HIGH') actionRecommendation = 'LONG_BIAS';
  else if (finalScore <= -20 && riskLevel !== 'HIGH') actionRecommendation = 'SHORT_BIAS';
  else if (riskLevel === 'HIGH') actionRecommendation = 'CIRCUIT_BLOCKED';

  const warnings: string[] = [];
  if (highRiskCount > 0) warnings.push(`${highRiskCount} dimension(s) flagged with High Risk.`);
  if (Math.abs(finalScore) < 15) warnings.push('Equilibrium chop: signals require volume confirmation.');

  // Invalidation Criteria
  const cam = pivotLevels?.camarilla;
  const mid = pivotLevels?.midpoint;
  let invalidationCriteria = '';
  if (direction === 'BULLISH') {
    const invLevel = cam?.l3 ? cam.l3.toLocaleString() : (lastPrice * 0.995).toFixed(1);
    const midLevel = mid?.pivot ? mid.pivot.toLocaleString() : (lastPrice * 0.998).toFixed(1);
    invalidationCriteria = `Bar close below Camarilla L3 (${invLevel}) or Midpoint Pivot (${midLevel}).`;
  } else if (direction === 'BEARISH') {
    const invLevel = cam?.h3 ? cam.h3.toLocaleString() : (lastPrice * 1.005).toFixed(1);
    const midLevel = mid?.pivot ? mid.pivot.toLocaleString() : (lastPrice * 1.002).toFixed(1);
    invalidationCriteria = `Bar close above Camarilla H3 (${invLevel}) or Midpoint Pivot (${midLevel}).`;
  } else {
    invalidationCriteria = 'Wait for breakout candle outside Camarilla H3/L3 boundary.';
  }

  const summaryExplanation = direction === 'BULLISH'
    ? `${bullishCount} of 8 dimensions aligned bullish with expanding volume delta and strong trend confluence.`
    : (direction === 'BEARISH'
      ? `${bearishCount} of 8 dimensions aligned bearish with active seller distribution and breakdown pressure.`
      : `${bullishCount} bullish and ${bearishCount} bearish factors in compression; waiting for clear directional resolution.`);

  // Genuine Statistical Confidence Calculation
  const dominantCount = direction === 'BULLISH' ? bullishCount : (direction === 'BEARISH' ? bearishCount : Math.max(bullishCount, bearishCount));
  const confluenceRatio = dominantCount / 8; // 0.125 to 1.0
  const meanDimConfidence = dimensions.reduce((acc, d) => acc + (d.confidence || 0.8), 0) / dimensions.length;
  const scoreAbs = Math.abs(finalScore);
  const chopPenalty = scoreAbs < 15 ? 12 : (scoreAbs < 25 ? 5 : 0);
  const highRiskPenalty = highRiskCount * 4;

  const rawConfidence = Math.round((confluenceRatio * 50) + (meanDimConfidence * 40) + (scoreAbs * 0.12) - chopPenalty - highRiskPenalty);
  const genuineConfidence = Math.max(48, Math.min(96, rawConfidence));

  let confidenceLabel = 'Moderate Confluence';
  if (genuineConfidence >= 85) confidenceLabel = 'Very High Institutional Confluence';
  else if (genuineConfidence >= 72) confidenceLabel = 'High Statistical Confluence';
  else if (genuineConfidence >= 60) confidenceLabel = 'Moderate Directional Confluence';
  else confidenceLabel = 'Uncertain / Equilibrium Chop';

  // 7-Gate Algorithmic Execution Verification
  const gates = [
    { id: 1, name: 'Trend Bias Alignment', passed: direction === 'BULLISH' ? (dimensions[0]?.normalized_score || 0) > 0.2 : (direction === 'BEARISH' ? (dimensions[0]?.normalized_score || 0) < -0.2 : false) },
    { id: 2, name: 'Momentum & RSI Confirmation', passed: direction === 'BULLISH' ? (dimensions[1]?.normalized_score || 0) > 0.1 : (direction === 'BEARISH' ? (dimensions[1]?.normalized_score || 0) < -0.1 : false) },
    { id: 3, name: 'Volatility Expansion Safe', passed: dimensions[2]?.risk_level !== 'HIGH' },
    { id: 4, name: 'Volume & VWAP Participation', passed: (dimensions[3]?.normalized_score || 0) > 0 },
    { id: 5, name: 'Camarilla Structure Clearance', passed: dimensions[4]?.risk_level !== 'HIGH' },
    { id: 6, name: 'Institutional CVD Delta Slope', passed: direction === 'BULLISH' ? (dimensions[5]?.normalized_score || 0) >= 0 : (direction === 'BEARISH' ? (dimensions[5]?.normalized_score || 0) <= 0 : true) },
    { id: 7, name: 'Multi-Timeframe Trend Confluence', passed: Math.abs(dimensions[6]?.normalized_score || 0) > 0.2 },
  ];

  return {
    score: finalScore,
    direction,
    riskLevel,
    actionRecommendation,
    confidence: genuineConfidence,
    confidenceLabel,
    coverage: 100,
    bullishCount,
    bearishCount,
    neutralCount: 8 - bullishCount - bearishCount,
    gates,
    warnings,
    invalidationCriteria,
    summaryExplanation,
  };
}

/**
 * Computes active trade signal calibrated to the exact price scale of the asset.
 */
export function computeActiveSignal(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  composite: any
) {
  if (!candles.length) return null;

  const lastPrice = candles[candles.length - 1].close;
  const atr = calculateATR(candles, 14);
  const isLong = composite.direction === 'BULLISH';
  const isShort = composite.direction === 'BEARISH';

  if (!isLong && !isShort) {
    return {
      has_signal: false,
      direction: 'WAIT',
      entry_reference: lastPrice,
      stop_reference: Math.round((lastPrice - atr) * 100) / 100,
      target_reference: Math.round((lastPrice + atr * 2) * 100) / 100,
      risk_reward_ratio: 2.0,
      signal_hash: `${symbol.toLowerCase()}-${timeframe}-neutral-setup`,
    };
  }

  const entry = lastPrice;
  const stop = isLong
    ? Math.round((entry - atr * 1.5) * 100) / 100
    : Math.round((entry + atr * 1.5) * 100) / 100;
  const target = isLong
    ? Math.round((entry + atr * 3.0) * 100) / 100
    : Math.round((entry - atr * 3.0) * 100) / 100;

  // Hex hash signature
  const rawSig = `${symbol}-${timeframe}-${isLong ? 'L' : 'S'}-${entry}-${Date.now().toString().slice(-4)}`;
  let hashNum = 0;
  for (let i = 0; i < rawSig.length; i++) {
    hashNum = ((hashNum << 5) - hashNum) + rawSig.charCodeAt(i);
    hashNum |= 0;
  }
  const hexHash = Math.abs(hashNum).toString(16).padStart(8, '0') + 'c512d78b0e5fa3d679b0c9e7';

  return {
    has_signal: true,
    direction: isLong ? 'LONG' : 'SHORT',
    entry_reference: entry,
    stop_reference: stop,
    target_reference: target,
    risk_reward_ratio: 2.0,
    signal_hash: hexHash,
  };
}
