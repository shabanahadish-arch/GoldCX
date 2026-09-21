/**
 * RiskPilot 8D - Main Application Container & Dashboard Shell
 * Multidimensional Real-Time Market-Risk Platform
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Layers, 
  Activity, 
  Flame, 
  Info, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';

import { Navbar } from './components/Navbar';
import { CandleChart } from './components/CandleChart';
import { RiskMatrix8D } from './components/RiskMatrix8D';
import { CompositeScoreCard } from './components/CompositeScoreCard';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { PaperTradingPanel } from './components/PaperTradingPanel';
import { BacktestPanel } from './components/BacktestPanel';
import { CsvUploadModal } from './components/CsvUploadModal';
import { StockManagerModal } from './components/StockManagerModal';

import { api } from './services/api';
import { 
  generateSyntheticCandles, 
  computeMockPivots, 
  computeMockZones, 
  computeMock8DMatrix,
  computeCompositeScore,
  computeActiveSignal,
  getSymbolDefaults
} from './services/mockData';
import { Candle } from './types';

export default function App() {
  const [symbol, setSymbol] = useState<string>('NIFTY');
  const [timeframe, setTimeframe] = useState<string>('5m');
  const [activeTab, setActiveTab] = useState<'radar' | 'calculator' | 'paper' | 'backtest'>('radar');

  const [candles, setCandles] = useState<Candle[]>([]);
  const [adaptiveZone, setAdaptiveZone] = useState<any>(null);
  const [pivotLevels, setPivotLevels] = useState<any>(null);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [compositeScore, setCompositeScore] = useState<any>({
    score: 34.5,
    direction: 'BULLISH',
    riskLevel: 'LOW',
    actionRecommendation: 'LONG_BIAS',
    confidence: 82,
    coverage: 100,
    warnings: [],
    invalidationCriteria: 'Hourly candle close below Midpoint Pivot.',
    summaryExplanation: 'Dimensions aligned with market momentum.',
  });
  const [activeSignal, setActiveSignal] = useState<any>(null);

  // Paper Trading State
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    cash: 500000.0,
    margin_used: 0.0,
    margin_available: 500000.0,
    unrealized_pnl: 0.0,
    realized_pnl: 0.0,
    total_equity: 500000.0,
    daily_pnl: 0.0,
    daily_pnl_pct: 0.0,
    peak_equity: 500000.0,
    drawdown_amount: 0.0,
    drawdown_pct: 0.0,
    open_positions_count: 0,
    is_trading_halted: false,
    halt_reason: '',
  });
  const [positions, setPositions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  // Modals & UI State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isKillModalOpen, setIsKillModalOpen] = useState<boolean>(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [stockRefreshKey, setStockRefreshKey] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const wsRef = useRef<WebSocket | null>(null);

  // Load Data on Symbol / Timeframe change
  useEffect(() => {
    let isSubscribed = true;

    async function loadData() {
      let dataLoaded = false;
      try {
        const fetchedCandles = await api.getCandles(symbol, timeframe, 120);
        if (isSubscribed && fetchedCandles && fetchedCandles.length > 20) {
          dataLoaded = true;
          setCandles(fetchedCandles);
          const analysis = await api.getRiskAnalysis(symbol, timeframe);
          if (analysis && analysis.dimensions) {
            setDimensions(analysis.dimensions);
            setAdaptiveZone(analysis.adaptive_zones);
            setPivotLevels(analysis.pivot_levels);
            setCompositeScore({
              score: analysis.composite_score.weighted_score,
              direction: analysis.composite_score.direction,
              riskLevel: analysis.composite_score.risk_level,
              actionRecommendation: analysis.composite_score.action_recommendation,
              confidence: analysis.composite_score.confidence_score,
              coverage: analysis.composite_score.coverage_score,
              warnings: analysis.composite_score.warnings,
              invalidationCriteria: analysis.composite_score.invalidation_criteria,
              summaryExplanation: analysis.composite_score.summary_explanation,
            });
          }
          const sig = await api.getSignals(symbol, timeframe);
          if (sig) setActiveSignal(sig);
        }
      } catch {}

      if (!dataLoaded && isSubscribed) {
        // High-fidelity algorithmic calculations for the specific pair and timeframe
        const config = getSymbolDefaults(symbol);
        const synthCandles = generateSyntheticCandles(symbol, config.basePrice, 100, timeframe);
        const pivots = computeMockPivots(synthCandles);
        const zones = computeMockZones(synthCandles);
        const dims = computeMock8DMatrix(synthCandles, symbol, timeframe);
        const comp = computeCompositeScore(dims, synthCandles[synthCandles.length - 1].close, pivots);
        const sig = computeActiveSignal(symbol, timeframe, synthCandles, comp);

        setCandles(synthCandles);
        setPivotLevels(pivots);
        setAdaptiveZone(zones);
        setDimensions(dims);
        setCompositeScore(comp);
        if (sig) setActiveSignal(sig);
      }
    }

    loadData();

    // 2. Setup WebSocket Live Stream
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/stream/${symbol}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TICK' && msg.price) {
            setCandles((prev) => {
              if (!prev.length) return prev;
              const last = { ...prev[prev.length - 1] };
              last.close = msg.price;
              if (msg.price > last.high) last.high = msg.price;
              if (msg.price < last.low) last.low = msg.price;
              const updated = [...prev.slice(0, -1), last];

              const dims = computeMock8DMatrix(updated, symbol, timeframe);
              const pivots = computeMockPivots(updated);
              const comp = computeCompositeScore(dims, msg.price, pivots);
              setDimensions(dims);
              setCompositeScore(comp);

              return updated;
            });

            // Refresh MTM unrealized PnL on positions
            setPositions((prevPositions) => {
              return prevPositions.map((pos) => {
                if (pos.symbol === symbol) {
                  const pnl = pos.side === 'BUY'
                    ? (msg.price - pos.entry_price) * pos.quantity
                    : (pos.entry_price - msg.price) * pos.quantity;
                  return { ...pos, current_price: msg.price, unrealized_pnl: pnl };
                }
                return pos;
              });
            });
          }
        } catch {}
      };

      wsRef.current = ws;
    } catch {}

    return () => {
      isSubscribed = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, timeframe, stockRefreshKey]);

  // Periodic Micro-Tick Simulation (scaled to symbol volatility)
  useEffect(() => {
    const interval = setInterval(() => {
      setLatencyMs(15 + Math.floor(Math.random() * 8));
      setCandles((prev) => {
        if (!prev.length) return prev;
        const last = { ...prev[prev.length - 1] };
        const config = getSymbolDefaults(symbol);
        const tickDelta = (Math.random() - 0.49) * (config.basePrice * 0.00035);
        const newClose = Math.round((last.close + tickDelta) * 100) / 100;
        last.close = newClose;
        if (newClose > last.high) last.high = newClose;
        if (newClose < last.low) last.low = newClose;
        const updated = [...prev.slice(0, -1), last];

        // Recompute dimensions and composite score
        const dims = computeMock8DMatrix(updated, symbol, timeframe);
        const pivots = computeMockPivots(updated);
        const comp = computeCompositeScore(dims, newClose, pivots);
        setDimensions(dims);
        setCompositeScore(comp);

        return updated;
      });

      // Also refresh mark-to-market positions
      setPositions((prevPositions) => {
        return prevPositions.map((pos) => {
          if (pos.symbol === symbol && candles.length) {
            const curP = candles[candles.length - 1].close;
            const pnl = pos.side === 'BUY'
              ? (curP - pos.entry_price) * pos.quantity
              : (pos.entry_price - curP) * pos.quantity;
            return { ...pos, current_price: curP, unrealized_pnl: pnl };
          }
          return pos;
        });
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [symbol, timeframe, candles.length]);

  // Update Portfolio Totals whenever positions or cash change
  useEffect(() => {
    const totalUnrealized = positions.reduce((acc, p) => acc + p.unrealized_pnl, 0);
    const totalMargin = positions.reduce((acc, p) => acc + p.margin_allocated, 0);
    const currentEquity = portfolioMetrics.cash + totalMargin + totalUnrealized;
    const peak = Math.max(portfolioMetrics.peak_equity, currentEquity);
    const dd = peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0;

    setPortfolioMetrics((prev) => ({
      ...prev,
      unrealized_pnl: totalUnrealized,
      margin_used: totalMargin,
      margin_available: Math.max(0, prev.cash),
      total_equity: currentEquity,
      peak_equity: peak,
      drawdown_pct: dd,
      open_positions_count: positions.length,
    }));
  }, [positions, portfolioMetrics.cash]);

  // Order Submission Handler
  const handleSubmitOrder = async (orderData: any) => {
    const currentPrice = candles.length ? candles[candles.length - 1].close : 22100;
    const notional = orderData.quantity * currentPrice;
    const reqMargin = notional * 0.2; // 20% margin

    if (portfolioMetrics.cash < reqMargin) {
      alert(`Margin Insufficient: Need ₹${reqMargin.toLocaleString()} but available cash is ₹${portfolioMetrics.cash.toLocaleString()}`);
      return;
    }

    const newPos = {
      id: `POS-${Date.now().toString().slice(-6)}`,
      symbol: orderData.symbol,
      side: orderData.side,
      quantity: orderData.quantity,
      entry_price: currentPrice,
      current_price: currentPrice,
      stop_price: orderData.stop_price,
      target_price: orderData.target_price,
      breakeven_price: currentPrice,
      unrealized_pnl: 0.0,
      margin_allocated: reqMargin,
      opened_at: new Date().toISOString(),
      status: 'OPEN',
    };

    setPositions((prev) => [newPos, ...prev]);
    setPortfolioMetrics((prev) => ({
      ...prev,
      cash: prev.cash - reqMargin,
    }));
  };

  // Close Position Handler
  const handleClosePosition = (positionId: string) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    const fees = 40.0; // Round-trip friction
    const netPnl = pos.unrealized_pnl - fees;

    const closedTrade = {
      id: `TRD-${Date.now().toString().slice(-6)}`,
      symbol: pos.symbol,
      side: pos.side,
      quantity: pos.quantity,
      entry_price: pos.entry_price,
      exit_price: pos.current_price,
      realized_pnl: netPnl,
      total_fees_paid: fees,
      exit_reason: 'MANUAL_CLOSE',
      opened_at: pos.opened_at,
      closed_at: new Date().toISOString(),
    };

    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    setTrades((prev) => [closedTrade, ...prev]);
    setPortfolioMetrics((prev) => ({
      ...prev,
      cash: prev.cash + pos.margin_allocated + netPnl,
      realized_pnl: prev.realized_pnl + netPnl,
    }));
  };

  // Emergency Kill Switch
  const handleTriggerKillSwitch = () => {
    setIsKillModalOpen(true);
  };

  const confirmKillSwitch = () => {
    // Liquidate all positions
    const newTrades: any[] = [];
    let recoveredCash = 0;
    let netPnlTotal = 0;

    positions.forEach((pos) => {
      const fees = 40.0;
      const netPnl = pos.unrealized_pnl - fees;
      recoveredCash += pos.margin_allocated + netPnl;
      netPnlTotal += netPnl;

      newTrades.push({
        id: `KILL-${Date.now().toString().slice(-6)}`,
        symbol: pos.symbol,
        side: pos.side,
        quantity: pos.quantity,
        entry_price: pos.entry_price,
        exit_price: pos.current_price,
        realized_pnl: netPnl,
        total_fees_paid: fees,
        exit_reason: 'KILL_SWITCH_LIQUIDATION',
        opened_at: pos.opened_at,
        closed_at: new Date().toISOString(),
      });
    });

    setPositions([]);
    setTrades((prev) => [...newTrades, ...prev]);
    setPortfolioMetrics((prev) => ({
      ...prev,
      cash: prev.cash + recoveredCash,
      realized_pnl: prev.realized_pnl + netPnlTotal,
      is_trading_halted: true,
      halt_reason: 'Emergency Kill Switch triggered by operator. All positions liquidated.',
    }));

    setIsKillModalOpen(false);
  };

  const handleResumeTrading = () => {
    setPortfolioMetrics((prev) => ({
      ...prev,
      is_trading_halted: false,
      halt_reason: '',
    }));
  };

  const handleResetPortfolio = () => {
    setPositions([]);
    setTrades([]);
    setPortfolioMetrics({
      cash: 500000.0,
      margin_used: 0.0,
      margin_available: 500000.0,
      unrealized_pnl: 0.0,
      realized_pnl: 0.0,
      total_equity: 500000.0,
      daily_pnl: 0.0,
      daily_pnl_pct: 0.0,
      peak_equity: 500000.0,
      drawdown_amount: 0.0,
      drawdown_pct: 0.0,
      open_positions_count: 0,
      is_trading_halted: false,
      halt_reason: '',
    });
  };

  const currentPrice = candles.length ? candles[candles.length - 1].close : 22100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        currentSymbol={symbol}
        onSelectSymbol={setSymbol}
        currentTimeframe={timeframe}
        onSelectTimeframe={setTimeframe}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={() => setIsCsvModalOpen(true)}
        onTriggerKillSwitch={handleTriggerKillSwitch}
        isTradingHalted={portfolioMetrics.is_trading_halted}
        latencyMs={latencyMs}
        onOpenStockManager={() => setIsStockModalOpen(true)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-28 md:pb-8 space-y-6">
        
        {/* Tab 1: 8D Radar & Interactive Candlestick Chart */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left 7 Columns: Chart + Decision Score Card */}
              <div className="lg:col-span-7 space-y-6">
                <CandleChart
                  candles={candles}
                  symbol={symbol}
                  timeframe={timeframe}
                  onSelectTimeframe={setTimeframe}
                  adaptiveZone={adaptiveZone}
                  pivotLevels={pivotLevels}
                />

                <CompositeScoreCard
                  score={compositeScore.score}
                  direction={compositeScore.direction}
                  riskLevel={compositeScore.riskLevel}
                  actionRecommendation={compositeScore.actionRecommendation}
                  confidence={compositeScore.confidence}
                  confidenceLabel={compositeScore.confidenceLabel}
                  coverage={compositeScore.coverage}
                  bullishCount={compositeScore.bullishCount}
                  bearishCount={compositeScore.bearishCount}
                  neutralCount={compositeScore.neutralCount}
                  gates={compositeScore.gates}
                  warnings={compositeScore.warnings}
                  invalidationCriteria={compositeScore.invalidationCriteria}
                  summaryExplanation={compositeScore.summaryExplanation}
                  activeSignal={activeSignal}
                  onOpenOrderModal={() => setActiveTab('paper')}
                />
              </div>

              {/* Right 5 Columns: 8-Dimensional Matrix */}
              <div className="lg:col-span-5 space-y-6">
                <RiskMatrix8D dimensions={dimensions} />
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Position Sizer & Friction Calculator */}
        {activeTab === 'calculator' && (
          <RiskCalculatorModal
            initialEquity={portfolioMetrics.total_equity}
            initialEntry={currentPrice}
            initialStop={activeSignal?.stop_reference || Math.round((currentPrice * 0.995) * 100) / 100}
            initialTarget={activeSignal?.target_reference || Math.round((currentPrice * 1.01) * 100) / 100}
            lotSize={getSymbolDefaults(symbol).lotSize}
            tickSize={getSymbolDefaults(symbol).tickSize}
          />
        )}

        {/* Tab 3: Virtual Paper Trading & Execution Ledger */}
        {activeTab === 'paper' && (
          <PaperTradingPanel
            metrics={portfolioMetrics}
            positions={positions}
            trades={trades}
            currentSymbol={symbol}
            currentPrice={currentPrice}
            onSubmitOrder={handleSubmitOrder}
            onClosePosition={handleClosePosition}
            onResumeTrading={handleResumeTrading}
            onResetPortfolio={handleResetPortfolio}
          />
        )}

        {/* Tab 4: Backtesting Research Lab */}
        {activeTab === 'backtest' && (
          <BacktestPanel
            currentSymbol={symbol}
            currentTimeframe={timeframe}
          />
        )}

      </main>

      {/* Stock & Asset Studio Modal */}
      <StockManagerModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        currentSymbol={symbol}
        onSelectSymbol={setSymbol}
        onStocksUpdated={() => setStockRefreshKey((k) => k + 1)}
      />

      {/* CSV Ingestion Modal */}
      <CsvUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onDataLoaded={(newSymbol, newCandles) => {
          setSymbol(newSymbol);
          setCandles(newCandles);
          setPivotLevels(computeMockPivots(newCandles));
          setAdaptiveZone(computeMockZones(newCandles));
          setDimensions(computeMock8DMatrix(newCandles, newSymbol, timeframe));
          setIsCsvModalOpen(false);
        }}
      />

      {/* Emergency Kill Switch Modal */}
      {isKillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <Flame className="w-6 h-6" />
              <h3 className="font-bold text-slate-100 text-base">Emergency Kill Switch</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              This action will <strong>immediately liquidate all {positions.length} open position(s)</strong> at prevailing market prices, cancel all pending orders, and engage an execution halt.
            </p>

            <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-900/60 text-xs text-rose-300">
              Are you certain you wish to halt trading and settle active exposure?
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsKillModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmKillSwitch}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-600/30"
              >
                Confirm Liquidation & Halt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Compliance Disclaimer Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-4 text-center text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Suparnova CX</strong> — Indian Stock Markets 8D Quantitative Risk & Real-Time Decision Terminal
          </span>
          <span className="text-slate-600">
            Quantitative algorithmic research only. NSE / BSE market feeds simulated with high fidelity. Never risk capital without verified stop limits.
          </span>
        </div>
      </footer>

    </div>
  );
}
