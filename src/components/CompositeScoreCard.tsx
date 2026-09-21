/**
 * RiskPilot 8D - Composite Score & Decision-Support Signal Card
 * Renders composite score meter (-100 to +100), 7-gate verification, and active signal details.
 */

import React from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  PauseCircle, 
  Hash, 
  Target, 
  CheckCircle2, 
  XCircle,
  ExternalLink
} from 'lucide-react';
import { Signal } from '../types';

interface CompositeScoreCardProps {
  score: number; // -100 to +100
  direction: string;
  riskLevel: string;
  actionRecommendation: string;
  confidence: number;
  coverage: number;
  warnings: string[];
  invalidationCriteria: string;
  summaryExplanation: string;
  activeSignal?: any;
  onOpenOrderModal?: (signal: any) => void;
}

export const CompositeScoreCard: React.FC<CompositeScoreCardProps> = ({
  score,
  direction,
  riskLevel,
  actionRecommendation,
  confidence,
  coverage,
  warnings,
  invalidationCriteria,
  summaryExplanation,
  activeSignal,
  onOpenOrderModal,
}) => {
  // Gauge position: 0% at -100, 50% at 0, 100% at +100
  const normalizedGaugePct = Math.max(0, Math.min(100, ((score + 100) / 200) * 100));

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'LONG_BIAS':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs">LONG BIAS</span>
          </div>
        );
      case 'SHORT_BIAS':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-xs">SHORT BIAS</span>
          </div>
        );
      case 'BLOCKED':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-xs">CIRCUIT BLOCKED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-700">
            <PauseCircle className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs">WAIT FOR SETUP</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-slate-100 text-sm">Composite 8D Decision Score</h3>
          <p className="text-xs text-slate-400">Multi-factor weighted confluence index</p>
        </div>
        {getActionBadge(actionRecommendation)}
      </div>

      {/* Meter / Gauge */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-400">Bearish (-100)</span>
          <div className="flex items-baseline space-x-1">
            <span className={`text-3xl font-extrabold font-mono ${
              score > 15 ? 'text-emerald-400' : score < -15 ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 100</span>
          </div>
          <span className="text-xs text-slate-400">Bullish (+100)</span>
        </div>

        {/* Meter Track */}
        <div className="relative h-3 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
          {/* Gradient Track */}
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)'
            }}
          />
          {/* Neutral center notch */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-400 z-10" />
          {/* Marker Thumb */}
          <div 
            className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-md transition-all duration-300 transform -translate-x-1/2 z-20"
            style={{ left: `${normalizedGaugePct}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-400 pt-1">
          <span>Confidence: <strong className="text-slate-200">{confidence.toFixed(0)}%</strong></span>
          <span>Coverage: <strong className="text-slate-200">{coverage.toFixed(0)}%</strong></span>
          <span>Risk Tier: <strong className={riskLevel === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}>{riskLevel}</strong></span>
        </div>
      </div>

      {/* Summary Explanation */}
      <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
        {summaryExplanation || 'Evaluating active multi-dimensional factor confluence against prevailing price action.'}
      </p>

      {/* Warnings & Invalidation */}
      {invalidationCriteria && (
        <div className="flex items-start space-x-2 text-xs bg-amber-950/30 text-amber-300 p-2.5 rounded-lg border border-amber-800/40">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Setup Invalidation Condition:</span>
            <span className="text-amber-200/90 leading-tight">{invalidationCriteria}</span>
          </div>
        </div>
      )}

      {/* Active Decision-Support Signal Card */}
      {activeSignal && activeSignal.has_signal ? (
        <div className="bg-slate-950 rounded-lg border border-indigo-900/60 p-3.5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                Active {activeSignal.direction} Setup
              </span>
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              <Hash className="w-3 h-3 text-slate-500" />
              <span>{activeSignal.signal_hash ? activeSignal.signal_hash.slice(0, 10) : 'VERIFIED'}...</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Entry Ref</span>
              <span className="font-mono font-bold text-slate-100">{activeSignal.entry_reference?.toFixed(2)}</span>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-rose-400 block">Stop Loss</span>
              <span className="font-mono font-bold text-rose-300">{activeSignal.stop_reference?.toFixed(2)}</span>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-emerald-400 block">Target (2R)</span>
              <span className="font-mono font-bold text-emerald-300">{activeSignal.target_reference?.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>R:R Ratio: <strong className="text-indigo-300 font-mono">1 : {activeSignal.risk_reward_ratio?.toFixed(1)}</strong></span>
            {onOpenOrderModal && (
              <button
                onClick={() => onOpenOrderModal(activeSignal)}
                className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Send to Paper Order
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
          <span>7-Gate safety filter active. No speculative entries permitted until full multi-timeframe confluence triggers.</span>
        </div>
      )}

    </div>
  );
};
