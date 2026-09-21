/**
 * RiskPilot 8D - Core Type Definitions & API Contracts
 * Unifies client and backend data contracts.
 */

export type MarketMode = 'backtest' | 'replay' | 'paper' | 'live-alert' | 'live';

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export type DirectionBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNAVAILABLE';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNAVAILABLE';

export type ActionRecommendation = 'LONG_BIAS' | 'SHORT_BIAS' | 'WAIT' | 'BLOCKED';

export type OrderStatus = 'CREATED' | 'ACCEPTED' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'CLOSED';

export type OrderSide = 'BUY' | 'SELL';

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  assetClass: 'EQUITY' | 'INDEX' | 'FUTURES' | 'FX' | 'COMMODITY';
  tickSize: number;
  lotSize: number;
  valuePerPoint: number;
  currency: string;
  isActive: boolean;
}

export interface Candle {
  time: number; // Unix timestamp in seconds for Lightweight Charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isComplete?: boolean;
}

export interface AdaptiveZone {
  index: number;
  label: string;
  lowerPrice: number;
  upperPrice: number;
  isCurrent: boolean;
}

export interface HigherTimeframePivot {
  timeframe: string;
  pivotPrice: number;
  formula: 'MIDPOINT' | 'TYPICAL';
  distancePct: number;
  bias: 'ABOVE' | 'BELOW' | 'AT_PIVOT';
  timestamp: string;
}

export interface RiskDimension {
  id: number;
  name: string;
  code: string;
  rawValue: number | null;
  normalizedScore: number; // [-1.0, 1.0]
  direction: DirectionBias;
  riskLevel: RiskLevel;
  confidence: number; // [0.0, 1.0]
  explanation: string;
  timestamp: string;
  warnings: string[];
  features: Record<string, number | string | boolean>;
  isAvailable: boolean;
}

export interface CompositeScoreState {
  symbol: string;
  timeframe: Timeframe;
  timestamp: string;
  weightedScore: number; // [-100, 100]
  confidence: number; // [0, 100]
  coverage: number; // [0, 100]
  direction: DirectionBias;
  riskLevel: RiskLevel;
  action: ActionRecommendation;
  invalidationCriteria: string;
  warnings: string[];
  summaryExplanation: string;
}

export interface Signal {
  id: string;
  signalHash: string;
  symbol: string;
  timeframe: Timeframe;
  timestamp: string;
  direction: 'LONG' | 'SHORT' | 'EXIT';
  entryReference: number;
  stopReference: number;
  targetReference: number;
  riskRewardRatio: number;
  compositeScore: number;
  confidence: number;
  riskLevel: RiskLevel;
  reasons: string[];
  invalidationCondition: string;
  dataQualityState: string;
  disclaimer: string;
}

export interface Position {
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  stopLoss?: number;
  takeProfit?: number;
  liquidationPrice?: number;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  executedPrice?: number;
  status: OrderStatus;
  estimatedFees: number;
  estimatedSlippage: number;
  createdAt: string;
}

export interface RiskCalculatorInput {
  equity: number;
  riskPercentage: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  tickSize: number;
  lotSize: number;
  valuePerPoint: number;
}

export interface RiskCalculatorOutput {
  quantity: number;
  stopDistance: number;
  targetDistance: number;
  maxLoss: number;
  potentialProfit: number;
  riskRewardRatio: number;
  breakevenPrice: number;
  marginEstimate: number;
  isValid: boolean;
  warnings: string[];
}

export interface BacktestParameters {
  symbol: string;
  timeframe: Timeframe;
  initialCapital: number;
  riskPerTradePct: number;
  brokerageFeePerOrder: number;
  exchangeFeePct: number;
  taxPct: number;
  slippageTicks: number;
  minCompositeScore: number;
  minConfidence: number;
  minCoverage: number;
  requireHtfAlignment: boolean;
}

export interface BacktestTrade {
  id: string;
  entryTime: string;
  exitTime: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  grossPnl: number;
  netPnl: number;
  feesPaid: number;
  slippagePaid: number;
  returnPct: number;
  exitReason: 'TARGET' | 'STOP' | 'INVALIDATION' | 'TIME_LIMIT';
}

export interface BacktestMetrics {
  initialCapital: number;
  finalEquity: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRatePct: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdownPct: number;
  maxConsecutiveLosses: number;
  avgHoldingBars: number;
  buyAndHoldReturnPct: number;
}

export interface DataQualityReport {
  symbol: string;
  status: 'OPTIMAL' | 'DEGRADED' | 'STALE' | 'CORRUPT';
  feedLatencyMs: number;
  totalCandles: number;
  missingCandles: number;
  outOfOrderCandles: number;
  duplicateCandlesRemoved: number;
  impossibleOhlcCount: number;
  lastCandleTimestamp: string;
}

export interface AuditLogEntry {
  id: string;
  eventType: string;
  userId?: string;
  ipAddress?: string;
  timestamp: string;
  details: Record<string, any>;
}
