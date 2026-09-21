/**
 * RiskPilot 8D - Primary Navigation & Controls Bar
 */

import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Layers, 
  Calculator, 
  SlidersHorizontal, 
  BarChart2, 
  UploadCloud, 
  AlertTriangle,
  Flame,
  Radio
} from 'lucide-react';

interface NavbarProps {
  currentSymbol: string;
  onSelectSymbol: (sym: string) => void;
  currentTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  activeTab: 'radar' | 'calculator' | 'paper' | 'backtest';
  onSelectTab: (tab: 'radar' | 'calculator' | 'paper' | 'backtest') => void;
  onOpenUpload: () => void;
  onTriggerKillSwitch: () => void;
  isTradingHalted: boolean;
  latencyMs: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSymbol,
  onSelectSymbol,
  currentTimeframe,
  onSelectTimeframe,
  activeTab,
  onSelectTab,
  onOpenUpload,
  onTriggerKillSwitch,
  isTradingHalted,
  latencyMs,
}) => {
  const symbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'BTCUSDT'];
  const timeframes = ['1m', '5m', '15m', '1h', '1d'];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Tag */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">RiskPilot <span className="text-indigo-400">8D</span></span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  Decision Support
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Multidimensional Risk & Quantitative Execution Engine</p>
            </div>
          </div>

          {/* Symbol & Timeframe Selectors */}
          <div className="flex items-center space-x-2 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
            {/* Symbol Dropdown */}
            <select
              value={currentSymbol}
              onChange={(e) => onSelectSymbol(e.target.value)}
              className="bg-slate-900 text-xs font-semibold text-slate-200 py-1.5 px-2.5 rounded border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {symbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>

            {/* Timeframe Chips */}
            <div className="flex items-center space-x-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onSelectTimeframe(tf)}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                    currentTimeframe === tf
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onSelectTab('radar')}
              className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'radar'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>8D Radar & Chart</span>
            </button>

            <button
              onClick={() => onSelectTab('calculator')}
              className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'calculator'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Risk Sizer</span>
            </button>

            <button
              onClick={() => onSelectTab('paper')}
              className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'paper'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Paper Trading</span>
            </button>

            <button
              onClick={() => onSelectTab('backtest')}
              className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'backtest'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Backtest Lab</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              title="Upload Custom CSV Data"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>CSV Ingest</span>
            </button>
          </nav>

          {/* Right Action Cluster: Latency & Emergency Kill Switch */}
          <div className="flex items-center space-x-3">
            {/* Live Feed Status */}
            <div className="hidden lg:flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono">{latencyMs}ms</span>
            </div>

            {/* Emergency Kill Switch */}
            <button
              onClick={onTriggerKillSwitch}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shadow-sm ${
                isTradingHalted
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>{isTradingHalted ? 'TRADING HALTED' : 'KILL SWITCH'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
