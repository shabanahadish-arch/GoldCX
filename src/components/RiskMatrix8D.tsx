/**
 * RiskPilot 8D - 8-Dimensional Quantitative Risk Matrix Component
 * Displays individual dimension scores, directional bias, confidence, and telemetry.
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
  ChevronUp 
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

export const RiskMatrix8D: React.FC<RiskMatrix8DProps> = ({ dimensions }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const getDirectionBadge = (dir: string) => {
    switch (dir.toUpperCase()) {
      case 'BULLISH':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">BULLISH</span>;
      case 'BEARISH':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">BEARISH</span>;
      default:
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">NEUTRAL</span>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'LOW':
        return <span className="text-[10px] uppercase font-bold text-emerald-400">Low Risk</span>;
      case 'HIGH':
        return <span className="text-[10px] uppercase font-bold text-rose-400">High Risk</span>;
      default:
        return <span className="text-[10px] uppercase font-bold text-amber-400">Medium</span>;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-slate-100 text-sm tracking-wide">8-Dimensional Risk Matrix</h3>
          <p className="text-xs text-slate-400">Algorithmic dimension telemetry and factor attribution</p>
        </div>
        <span className="text-xs text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-800 font-mono">
          8 Active Factors
        </span>
      </div>

      <div className="divide-y divide-slate-800/60 mt-2">
        {dimensions.map((dim, idx) => {
          const Icon = DIMENSION_ICONS[idx] || Activity;
          const isExpanded = expandedIndex === idx;
          const score = dim.normalized_score; // -1.0 to 1.0
          const barWidthPct = Math.min(Math.abs(score) * 50, 50); // 0 to 50% from center

          return (
            <div key={dim.dimension_index} className="py-3 hover:bg-slate-850/40 transition-colors">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpand(idx)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {dim.dimension_index}. {dim.dimension_name}
                      </span>
                      {getDirectionBadge(dim.direction)}
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">Confidence: {(dim.confidence * 100).toFixed(0)}%</span>
                      <span className="text-slate-600">•</span>
                      {getRiskBadge(dim.risk_level)}
                    </div>
                  </div>
                </div>

                {/* Centered Score Bar */}
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:flex flex-col items-center w-36">
                    <div className="relative w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      {/* Center zero divider */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-700 z-10" />
                      {score >= 0 ? (
                        <div 
                          className="absolute top-0 bottom-0 left-1/2 bg-emerald-500 rounded-r-full"
                          style={{ width: `${barWidthPct}%` }}
                        />
                      ) : (
                        <div 
                          className="absolute top-0 bottom-0 bg-rose-500 rounded-l-full"
                          style={{ right: '50%', width: `${barWidthPct}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">
                      {score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
                    </span>
                  </div>

                  <button className="text-slate-400 hover:text-slate-200 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="mt-3 pl-11 pr-2 space-y-2 text-xs">
                  <p className="text-slate-300 leading-relaxed bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    {dim.explanation}
                  </p>
                  {dim.metrics && Object.keys(dim.metrics).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50 font-mono text-[11px]">
                      {Object.entries(dim.metrics).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-slate-400 px-1">
                          <span className="capitalize">{k.replace(/_/g, ' ')}:</span>
                          <span className="text-slate-200 font-semibold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
