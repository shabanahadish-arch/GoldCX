/**
 * RiskPilot 8D - Position Sizing & Capital Preservation Calculator
 * Computes exact lot sizing, max allowable loss, round-trip frictions, and post-friction breakeven price.
 */

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  ShieldAlert, 
  DollarSign, 
  Percent, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface RiskCalculatorProps {
  initialEquity?: number;
  initialEntry?: number;
  initialStop?: number;
  initialTarget?: number;
  lotSize?: number;
  tickSize?: number;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorProps> = ({
  initialEquity = 500000,
  initialEntry = 22100,
  initialStop = 22060,
  initialTarget = 22200,
  lotSize = 50,
  tickSize = 0.05,
}) => {
  const [equity, setEquity] = useState<number>(initialEquity);
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(initialEntry);
  const [stopPrice, setStopPrice] = useState<number>(initialStop);
  const [targetPrice, setTargetPrice] = useState<number>(initialTarget);
  const [contractLotSize, setContractLotSize] = useState<number>(lotSize);
  const [brokeragePerOrder, setBrokeragePerOrder] = useState<number>(20.0);
  const [taxPct, setTaxPct] = useState<number>(0.02);
  const [slippageTicks, setSlippageTicks] = useState<number>(2);

  // Sync if props change
  useEffect(() => {
    if (initialEntry) setEntryPrice(initialEntry);
    if (initialStop) setStopPrice(initialStop);
    if (initialTarget) setTargetPrice(initialTarget);
  }, [initialEntry, initialStop, initialTarget]);

  // Mathematical Calculation Engine
  const maxAllowableRisk = (equity * riskPct) / 100;
  const isLong = entryPrice >= stopPrice;
  const stopDistance = Math.abs(entryPrice - stopPrice);
  const targetDistance = Math.abs(targetPrice - entryPrice);

  let lots = 0;
  let executableQuantity = 0;
  let actualRisk = 0;
  let potentialProfit = 0;
  let totalFriction = 0;
  let breakevenPrice = entryPrice;
  let effectiveRR = 0;
  let isValid = stopDistance > 0 && maxAllowableRisk > 0 && contractLotSize > 0;

  if (isValid) {
    const rawUnits = maxAllowableRisk / stopDistance;
    lots = Math.floor(rawUnits / contractLotSize);
    executableQuantity = lots * contractLotSize;

    if (executableQuantity > 0) {
      actualRisk = executableQuantity * stopDistance;
      potentialProfit = executableQuantity * targetDistance;

      // Friction breakdown
      const turnover = executableQuantity * entryPrice * 2;
      const brokerage = brokeragePerOrder * 2;
      const exchangeTax = (turnover * taxPct) / 100;
      const slippage = executableQuantity * (slippageTicks * tickSize);
      totalFriction = brokerage + exchangeTax + slippage;

      const frictionPerUnit = totalFriction / executableQuantity;
      breakevenPrice = isLong ? entryPrice + frictionPerUnit : entryPrice - frictionPerUnit;

      const netProfit = potentialProfit - totalFriction;
      const netRisk = actualRisk + totalFriction;
      effectiveRR = netRisk > 0 ? netProfit / netRisk : 0;
    }
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-md max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-base">Mathematical Position Sizer & Friction Engine</h2>
            <p className="text-xs text-slate-400">Deterministic lot sizing, capital preservation limit, and fee drag analysis</p>
          </div>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800 font-mono">
          Capital Preservation Gate
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Left: Input Parameters */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Trading Account & Setup Parameters</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Account Equity (₹/$)</label>
              <input
                type="number"
                value={equity}
                onChange={(e) => setEquity(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 text-slate-100 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Max Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 text-slate-100 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Entry Price</label>
              <input
                type="number"
                step="0.05"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 text-slate-100 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
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
              <label className="text-xs text-emerald-400 font-medium block mb-1">Profit Target</label>
              <input
                type="number"
                step="0.05"
                value={targetPrice}
                onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 text-emerald-300 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Lot Size</label>
              <input
                type="number"
                value={contractLotSize}
                onChange={(e) => setContractLotSize(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 text-slate-100 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Brokerage (₹/order)</label>
              <input
                type="number"
                value={brokeragePerOrder}
                onChange={(e) => setBrokeragePerOrder(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 text-slate-100 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Slippage Ticks</label>
              <input
                type="number"
                value={slippageTicks}
                onChange={(e) => setSlippageTicks(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 text-slate-100 text-xs font-mono px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Max Allowable Loss ({riskPct}%):</span>
              <strong className="text-rose-400 font-mono">₹{maxAllowableRisk.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span>Stop Distance:</span>
              <strong className="text-slate-200 font-mono">{stopDistance.toFixed(2)} pts ({(stopDistance / entryPrice * 100).toFixed(2)}%)</strong>
            </div>
          </div>
        </div>

        {/* Right: Calculated Execution Output */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Deterministic Execution Output</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-800/60">
              <span className="text-[11px] text-indigo-300 font-medium block">Allocated Lots</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-extrabold font-mono text-indigo-100">{lots}</span>
                <span className="text-xs text-indigo-400">Lots ({executableQuantity} Units)</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium block">Effective R:R Multiple</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-extrabold font-mono text-emerald-400">1 : {effectiveRR.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2.5 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span>Actual Capital at Risk:</span>
              <strong className="text-rose-400 font-bold">₹{actualRisk.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Gross Potential Profit:</span>
              <strong className="text-emerald-400 font-bold">₹{potentialProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-850">
              <span>Estimated Friction (Broker + STT + Slip):</span>
              <span className="text-amber-400">₹{totalFriction.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-100 pt-1 border-t border-slate-800 font-bold">
              <span>Post-Friction Breakeven Price:</span>
              <span className="text-indigo-400 font-mono text-sm">{breakevenPrice.toFixed(2)}</span>
            </div>
          </div>

          {lots === 0 && (
            <div className="flex items-center space-x-2 text-xs bg-rose-950/40 text-rose-300 p-3 rounded-lg border border-rose-800/60">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Risk allocation too small for 1 full contract lot. Increase capital or reduce stop distance.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
