/**
 * RiskPilot 8D - Virtual Paper Trading & Execution Ledger Component
 * Interactive order ticket, mark-to-market positions, drawdown monitor, and kill-switch control.
 */

import React, { useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  XCircle,
  Play,
  RotateCcw
} from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entry_price: number;
  current_price: number;
  stop_price?: number;
  target_price?: number;
  breakeven_price: number;
  unrealized_pnl: number;
  margin_allocated: number;
  opened_at: string;
  status: string;
}

interface TradeLog {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  exit_price: number;
  realized_pnl: number;
  total_fees_paid: number;
  exit_reason: string;
  opened_at: string;
  closed_at?: string;
}

interface PortfolioMetrics {
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
}

interface PaperTradingPanelProps {
  metrics: PortfolioMetrics;
  positions: Position[];
  trades: TradeLog[];
  currentSymbol: string;
  currentPrice: number;
  onSubmitOrder: (order: {
    symbol: string;
    side: string;
    quantity: number;
    order_type: string;
    stop_price?: number;
    target_price?: number;
  }) => void;
  onClosePosition: (positionId: string) => void;
  onResumeTrading: () => void;
  onResetPortfolio: () => void;
}

export const PaperTradingPanel: React.FC<PaperTradingPanelProps> = ({
  metrics,
  positions,
  trades,
  currentSymbol,
  currentPrice,
  onSubmitOrder,
  onClosePosition,
  onResumeTrading,
  onResetPortfolio,
}) => {
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(50);
  const [stopPrice, setStopPrice] = useState<number>(() => Math.round((currentPrice * 0.995) * 100) / 100);
  const [targetPrice, setTargetPrice] = useState<number>(() => Math.round((currentPrice * 1.01) * 100) / 100);
  const [orderType, setOrderType] = useState<string>('MARKET');

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitOrder({
      symbol: currentSymbol,
      side: orderSide,
      quantity,
      order_type: orderType,
      stop_price: stopPrice,
      target_price: targetPrice,
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Portfolio Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">Total Equity</span>
          <span className="text-lg font-bold font-mono text-slate-100">
            ₹{metrics.total_equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">Available Cash</span>
          <span className="text-lg font-bold font-mono text-indigo-300">
            ₹{metrics.cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">Margin Utilized</span>
          <span className="text-lg font-bold font-mono text-slate-200">
            ₹{metrics.margin_used.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">Unrealized MTM</span>
          <span className={`text-lg font-bold font-mono ${
            metrics.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {metrics.unrealized_pnl >= 0 ? '+' : ''}₹{metrics.unrealized_pnl.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">Realized PnL</span>
          <span className={`text-lg font-bold font-mono ${
            metrics.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {metrics.realized_pnl >= 0 ? '+' : ''}₹{metrics.realized_pnl.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">Peak Drawdown</span>
          <div className="flex items-center space-x-1.5">
            <span className={`text-lg font-bold font-mono ${
              metrics.drawdown_pct > 3 ? 'text-rose-400' : 'text-slate-200'
            }`}>
              {metrics.drawdown_pct.toFixed(2)}%
            </span>
            {metrics.drawdown_pct >= 6 && (
              <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                Breaker
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Circuit Breaker & Safety Freeze Alert */}
      {metrics.is_trading_halted && (
        <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <div>
              <h4 className="text-sm font-bold text-rose-200">Execution Circuit Breaker Active</h4>
              <p className="text-xs text-rose-300/80">{metrics.halt_reason || 'Trading halted due to risk threshold limit.'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onResumeTrading}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white border border-rose-700 transition-colors"
            >
              Resume Trading
            </button>
            <button
              onClick={onResetPortfolio}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Portfolio</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Order Ticket & Open Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Order Ticket */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">Virtual Order Ticket</h3>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
              {currentSymbol} @ {currentPrice.toFixed(2)}
            </span>
          </div>

          <form onSubmit={handleOrderSubmit} className="space-y-4">
            {/* Side Selection Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderSide('BUY')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  orderSide === 'BUY'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                BUY / LONG
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('SELL')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  orderSide === 'SELL'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Contract Quantity (Units)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 text-slate-100 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Stop Loss & Target Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-rose-400 font-medium block mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="0.05"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 text-rose-300 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-emerald-400 font-medium block mb-1">Target</label>
                <input
                  type="number"
                  step="0.05"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 text-emerald-300 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Estimated Notional & Margin */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Notional Value:</span>
                <span className="text-slate-200">₹{(quantity * currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Margin:</span>
                <span className="text-indigo-400">₹{(quantity * currentPrice * 0.2).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={metrics.is_trading_halted}
              className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition-all ${
                metrics.is_trading_halted
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : orderSide === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20'
              }`}
            >
              Execute Paper {orderSide}
            </button>
          </form>
        </div>

        {/* Active Open Positions Table */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">Active Open Positions ({positions.length})</h3>
            <span className="text-xs text-slate-400">Real-time MTM mark</span>
          </div>

          {positions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No open virtual positions. Use the order ticket or decision signal to open a trade.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Side</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2">Entry</th>
                    <th className="pb-2">Mark</th>
                    <th className="pb-2">Stop / Target</th>
                    <th className="pb-2">Unrealized</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {positions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-slate-850/40">
                      <td className="py-3 font-semibold text-slate-200">{pos.symbol}</td>
                      <td className="py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          pos.side === 'BUY' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                        }`}>
                          {pos.side === 'BUY' ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-300">{pos.quantity}</td>
                      <td className="py-3 font-mono text-slate-300">{pos.entry_price.toFixed(2)}</td>
                      <td className="py-3 font-mono text-slate-300">{pos.current_price.toFixed(2)}</td>
                      <td className="py-3 font-mono text-slate-400 text-[11px]">
                        SL: {pos.stop_price?.toFixed(1) || '-'} | TP: {pos.target_price?.toFixed(1) || '-'}
                      </td>
                      <td className={`py-3 font-mono font-bold ${
                        pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {pos.unrealized_pnl >= 0 ? '+' : ''}₹{pos.unrealized_pnl.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Closed Trades History Ledger */}
      {trades.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-100">Closed Settlement History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-2">Trade ID</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">Exit</th>
                  <th className="pb-2">Realized PnL</th>
                  <th className="pb-2">Fees</th>
                  <th className="pb-2">Exit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {trades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-850/40">
                    <td className="py-2.5 text-slate-500">{t.id.slice(0, 10)}</td>
                    <td className="py-2.5 font-bold text-slate-200">{t.symbol}</td>
                    <td className="py-2.5">{t.side}</td>
                    <td className="py-2.5">{t.quantity}</td>
                    <td className="py-2.5">{t.entry_price.toFixed(2)}</td>
                    <td className="py-2.5">{t.exit_price.toFixed(2)}</td>
                    <td className={`py-2.5 font-bold ${
                      t.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {t.realized_pnl >= 0 ? '+' : ''}₹{t.realized_pnl.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-slate-400">₹{t.total_fees_paid.toFixed(2)}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-300">
                        {t.exit_reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
