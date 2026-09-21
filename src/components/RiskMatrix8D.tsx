/**
 * RiskPilot 8D - Upgraded Institutional 8-Dimensional Quantitative Risk Matrix
 * Features: Multi-view modes (Detailed Cards vs Compact Matrix), center-zero divergence meters,
 * genuine statistical confidence metrics, live indicator telemetry, and quantitative formula drill-downs.
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Zap, 
  Activity, 
  BarChart, 
  Crosshair, 
  Workflow, 
  Clock, 
  Globe, 
  Info, 
  ChevronDown, 
  ChevronUp,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Cpu
} from 'lucide-react';

interface DimensionItem {
  dimension_index: number;
  dimension_name: string;
  raw_score: number;
  normalized_score: number;
  confidence: number;
  direction: string;
  risk_level: string;
  explanation: string;
  metrics: Record<string, any>;
}

interface RiskMatrix8DProps {
  dimensions: DimensionItem[];
}

const DIMENSION_ICONS = [
  TrendingUp,
  Zap,
  Activity,
  BarChart,
  Crosshair,
  Workflow,
  Clock,
  Globe,
];

const DIMENSION_FORMULAS = [
  'Trend Slope = (EMA20 - EMA50) / ATR(14)',
  'Momentum = w1*RSI(14) + w2*MACD_Hist + w3*Stoch_K',
  'Volatility = ATR(14) / SMA20 + BB_Bandwidth_Expansion',
  'Volume = RVOL(20) * (Close - VWAP) / VWAP',
  'Structure = Min_Dist(Close, [Camarilla_H3, Camarilla_L3, Pivot])',
  'Order Flow = CVD_Delta_Slope * Buyer_Absorption_Ratio',
  'MTF Confluence = Sum(Trend_TF_i * Weight_TF_i) / Total_Weights',
  'Regime Risk = Implied_Vol(VIX) - Realized_Vol_Ratio',
];

export const RiskMatrix8D: React.FC<RiskMatrix8DProps> = ({ dimensions }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'HIGH_RISK'>('ALL');

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  // Compute Confluence Stats
  const bullishCount = dimensions.filter((d) => d.direction === 'BULLISH').length;
  const bearishCount = dimensions.filter((d) => d.direction === 'BEARISH').length;
  const neutralCount = dimensions.length - bullishCount - bearishCount;

  // Filter dimensions
  const filteredDimensions = dimensions.filter((d) => {
    if (activeFilter === 'BULLISH') return d.direction === 'BULLISH';
    if (activeFilter === 'BEARISH') return d.direction === 'BEARISH';
    if (activeFilter === 'HIGH_RISK') return d.risk_level === 'HIGH';
    return true;
  });

  const getDirectionBadge = (dir: string) => {
    switch (dir.toUpperCase()) {
      case 'BULLISH':
        return (
          <span className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>BULLISH</span>
          </span>
        );
      case 'BEARISH':
        return (
          <span className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-700/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            <span>BEARISH</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>NEUTRAL</span>
          </span>
        );
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'LOW':
        return <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900">Low Risk</span>;
      case 'HIGH':
        return <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900">High Risk</span>;
      default:
        return <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900">Moderate</span>;
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl space-y-4">
      
      {/* 1. Header & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-extrabold text-slate-100 text-base tracking-tight font-sans">
              8-Dimensional Risk Matrix
            </h3>
            <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/90 px-2 py-0.5 rounded-full border border-indigo-800">
              v2.4 QUANT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-normal">
            Real-time algorithmic factor decomposition and directional divergence
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('detailed')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'detailed'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Detailed</span>
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'compact'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Matrix Grid</span>
          </button>
        </div>
      </div>

      {/* 2. Confluence Balance Meter & Filter Pills */}
      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Factor Confluence Breakdown
          </span>
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="text-emerald-400 font-bold">{bullishCount} Bullish</span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400 font-bold">{bearishCount} Bearish</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400 font-bold">{neutralCount} Neutral</span>
          </div>
        </div>

        {/* Proportional Segmented Bar */}
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
          <div 
            className="bg-emerald-500 transition-all duration-500" 
            style={{ width: `${(bullishCount / 8) * 100}%` }}
          />
          <div 
            className="bg-amber-500 transition-all duration-500" 
            style={{ width: `${(neutralCount / 8) * 100}%` }}
          />
          <div 
            className="bg-rose-500 transition-all duration-500" 
            style={{ width: `${(bearishCount / 8) * 100}%` }}
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(['ALL', 'BULLISH', 'BEARISH', 'HIGH_RISK'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                activeFilter === filter
                  ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Render View Mode (Detailed Cards vs Compact Grid) */}
      {viewMode === 'detailed' ? (
        <div className="divide-y divide-slate-800/60">
          {filteredDimensions.map((dim) => {
            const idx = dim.dimension_index - 1;
            const Icon = DIMENSION_ICONS[idx] || Activity;
            const isExpanded = expandedIndex === idx;
            const score = dim.normalized_score; // -1.0 to 1.0
            
            // Calculate percentage from center (0 to 50%)
            const barWidthPct = Math.min(Math.abs(score) * 50, 50);

            return (
              <div 
                key={dim.dimension_index} 
                className="py-3.5 hover:bg-slate-850/40 rounded-xl transition-all px-2 -mx-2"
              >
                {/* Header Row */}
                <div 
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => toggleExpand(idx)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-indigo-400 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-100">
                          {dim.dimension_index}. {dim.dimension_name}
                        </span>
                        {getDirectionBadge(dim.direction)}
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">
                          Confidence: <strong className="text-slate-300">{(dim.confidence * 100).toFixed(0)}%</strong>
                        </span>
                        <span className="text-slate-600">•</span>
                        {getRiskBadge(dim.risk_level)}
                      </div>
                    </div>
                  </div>

                  {/* Score Meter & Expand Trigger */}
                  <div className="flex items-center space-x-3">
                    {/* Visual Center-Zero Divergence Bar */}
                    <div className="hidden sm:block w-28 text-right">
                      <div className="text-[11px] font-mono font-bold text-slate-200">
                        {score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
                      </div>
                      <div className="relative h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-1">
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-600 z-10" />
                        {score >= 0 ? (
                          <div 
                            className="absolute top-0 bottom-0 left-1/2 bg-emerald-500 rounded-r"
                            style={{ width: `${barWidthPct}%` }}
                          />
                        ) : (
                          <div 
                            className="absolute top-0 bottom-0 bg-rose-500 rounded-l"
                            style={{ 
                              right: '50%',
                              width: `${barWidthPct}%` 
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="text-slate-500 p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Explanation Summary */}
                <p className="text-xs text-slate-300 mt-2 pl-11 leading-relaxed">
                  {dim.explanation}
                </p>

                {/* Expanded Quantitative Drill-down */}
                {isExpanded && (
                  <div className="mt-3.5 pl-11 space-y-3 pt-2 border-t border-slate-800/80">
                    
                    {/* Live Metric Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(dim.metrics).map(([key, val]) => (
                        <div key={key} className="bg-slate-950/90 p-2 rounded-lg border border-slate-800 text-left">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block truncate">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-mono font-bold text-indigo-300 mt-0.5 block truncate">
                            {typeof val === 'number' ? val.toLocaleString() : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Formula Reference */}
                    <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-2.5 flex items-start space-x-2 text-xs">
                      <Cpu className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-indigo-200 block text-[11px]">Algorithmic Evaluation Model:</span>
                        <code className="font-mono text-[11px] text-indigo-300/90 block mt-0.5">
                          {DIMENSION_FORMULAS[idx] || 'Weighted Indicator Regression'}
                        </code>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Matrix Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {filteredDimensions.map((dim) => {
            const idx = dim.dimension_index - 1;
            const Icon = DIMENSION_ICONS[idx] || Activity;
            const score = dim.normalized_score;
            const barWidthPct = Math.min(Math.abs(score) * 50, 50);

            return (
              <div 
                key={dim.dimension_index}
                className="bg-slate-950/90 rounded-xl border border-slate-800 p-3 hover:border-slate-700 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {dim.dimension_name}
                    </span>
                  </div>
                  {getDirectionBadge(dim.direction)}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Score: <strong className="text-slate-200">{score > 0 ? `+${score}` : score}</strong></span>
                  <span>Conf: <strong className="text-slate-200">{(dim.confidence * 100).toFixed(0)}%</strong></span>
                  {getRiskBadge(dim.risk_level)}
                </div>

                {/* Mini Divergence Bar */}
                <div className="relative h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-600 z-10" />
                  {score >= 0 ? (
                    <div 
                      className="absolute top-0 bottom-0 left-1/2 bg-emerald-500 rounded-r"
                      style={{ width: `${barWidthPct}%` }}
                    />
                  ) : (
                    <div 
                      className="absolute top-0 bottom-0 bg-rose-500 rounded-l"
                      style={{ 
                        right: '50%',
                        width: `${barWidthPct}%` 
                      }}
                    />
                  )}
                </div>

                <p className="text-[11px] text-slate-400 truncate">
                  {dim.explanation}
                </p>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
