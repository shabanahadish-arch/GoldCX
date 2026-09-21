/**
 * Suparnova CX - Institutional Trading Desk Navigation & Controls Bar
 * Dedicated to Indian Stocks, Benchmark Indices (NIFTY 50, Bank Nifty),
 * Multi-Timeframe Switching, Custom Stock Studio, and Execution Safety.
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Calculator, 
  SlidersHorizontal, 
  BarChart2, 
  UploadCloud, 
  Flame,
  Search, 
  ChevronDown, 
  TrendingUp, 
  TrendingDown, 
  Menu, 
  X, 
  Clock, 
  Plus, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { 
  getAllActiveCategories, 
  getSymbolDefaults, 
  ALL_TIMEFRAMES, 
  SYMBOL_CONFIGS 
} from '../services/mockData';

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
  onOpenStockManager?: () => void;
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
  onOpenStockManager,
}) => {
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const popularTimeframes = ['1m', '5m', '15m', '1h', '1D'];
  const currentConfig = getSymbolDefaults(currentSymbol);
  const categories = getAllActiveCategories();

  // Filter symbols based on search
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    symbols: cat.symbols.filter((sym) => {
      const config = getSymbolDefaults(sym);
      const q = symbolSearchQuery.toLowerCase();
      return (
        sym.toLowerCase().includes(q) ||
        (config && config.displayName.toLowerCase().includes(q))
      );
    }),
  })).filter((cat) => cat.symbols.length > 0);

  return (
    <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 text-slate-100 sticky top-0 z-50">
      
      {/* 1. Top Real-Time Indian Market Ticker Marquee */}
      <div className="bg-slate-900/90 border-b border-slate-800/60 py-1 px-3 text-[11px] overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-5 min-w-max">
          <div className="flex items-center space-x-1.5 text-slate-400 font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">NSE / BSE FEED</span>
          </div>

          {[
            { sym: 'NIFTY', price: '₹22,150.00', chg: '+0.48%', up: true },
            { sym: 'BANKNIFTY', price: '₹47,200.00', chg: '+0.35%', up: true },
            { sym: 'FINNIFTY', price: '₹21,400.00', chg: '+0.62%', up: true },
            { sym: 'SENSEX', price: '₹73,150.00', chg: '+0.41%', up: true },
            { sym: 'RELIANCE', price: '₹2,925.00', chg: '+1.15%', up: true },
            { sym: 'HDFCBANK', price: '₹1,650.00', chg: '+0.25%', up: true },
            { sym: 'TCS', price: '₹4,180.00', chg: '-0.38%', up: false },
            { sym: 'TATAMOTORS', price: '₹965.00', chg: '+1.85%', up: true },
            { sym: 'INFY', price: '₹1,880.00', chg: '+0.92%', up: true },
            { sym: 'ITC', price: '₹475.00', chg: '+0.15%', up: true },
            { sym: 'LT', price: '₹3,680.00', chg: '+0.80%', up: true },
          ].map((item) => (
            <button
              key={item.sym}
              onClick={() => onSelectSymbol(item.sym)}
              className={`flex items-center space-x-1.5 font-mono hover:bg-slate-800 px-2 py-0.5 rounded transition-colors ${
                currentSymbol === item.sym ? 'bg-indigo-950/80 border border-indigo-700/60 shadow-sm' : ''
              }`}
            >
              <span className="font-semibold text-slate-200">{item.sym}</span>
              <span className="text-slate-300">{item.price}</span>
              <span className={`text-[10px] flex items-center ${item.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {item.up ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                {item.chg}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Institutional Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tag */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30 shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-sans">
                  Suparnova <span className="text-indigo-400 font-black">CX</span>
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-800 shadow-sm hidden xs:inline-block font-mono">
                  CX PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Indian Markets 8D Quantitative Risk & Real-Time Decision Terminal
              </p>
            </div>
          </div>

          {/* Symbol Selector & Timeframe Controls (Desktop & Tablet) */}
          <div className="hidden lg:flex items-center space-x-2.5">
            
            {/* Custom Categorized Symbol Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsSymbolDropdownOpen(!isSymbolDropdownOpen);
                  setIsTimeframeDropdownOpen(false);
                }}
                className="flex items-center space-x-2.5 bg-slate-900 hover:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-xs font-semibold text-slate-100 shadow-inner"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                <div className="text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-100 font-bold font-mono text-sm">{currentSymbol}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-normal">
                      ₹{currentConfig.basePrice.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block -mt-0.5 max-w-[140px] truncate">
                    {currentConfig.displayName}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isSymbolDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isSymbolDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsSymbolDropdownOpen(false)} 
                  />
                  <div className="absolute left-0 mt-2 w-80 bg-slate-900/98 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl z-50 overflow-hidden">
                    
                    {/* Search Input & Quick Add */}
                    <div className="p-2.5 border-b border-slate-800 flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={symbolSearchQuery}
                          onChange={(e) => setSymbolSearchQuery(e.target.value)}
                          placeholder="Search Indian stock or index..."
                          className="w-full bg-slate-950 text-xs text-slate-100 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                          autoFocus
                        />
                      </div>

                      {onOpenStockManager && (
                        <button
                          onClick={() => {
                            setIsSymbolDropdownOpen(false);
                            onOpenStockManager();
                          }}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                          title="Add or Update Indian Stocks"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Categorized List */}
                    <div className="max-h-72 overflow-y-auto p-2 space-y-3 text-xs">
                      {filteredCategories.map((category) => (
                        <div key={category.id} className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 px-2 block pt-1">
                            {category.name}
                          </span>
                          {category.symbols.map((sym) => {
                            const conf = getSymbolDefaults(sym);
                            const isSelected = currentSymbol === sym;
                            return (
                              <button
                                key={sym}
                                onClick={() => {
                                  onSelectSymbol(sym);
                                  setIsSymbolDropdownOpen(false);
                                  setSymbolSearchQuery('');
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                                  isSelected 
                                    ? 'bg-indigo-600 text-white font-bold' 
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-mono font-bold block">{sym}</span>
                                    {conf.isCustom && (
                                      <span className="text-[9px] px-1 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                        CUSTOM
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-[10px] truncate max-w-[150px] block ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                    {conf?.displayName}
                                  </span>
                                </div>
                                <span className={`text-[11px] font-mono font-semibold ${isSelected ? 'text-white' : 'text-emerald-400'}`}>
                                  ₹{conf?.basePrice.toLocaleString()}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Footer Action */}
                    {onOpenStockManager && (
                      <div className="p-2 border-t border-slate-800 bg-slate-950/80 text-center">
                        <button
                          onClick={() => {
                            setIsSymbolDropdownOpen(false);
                            onOpenStockManager();
                          }}
                          className="w-full py-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-900 rounded-lg transition-colors font-medium flex items-center justify-center space-x-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Stock / Manage Watchlist</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Quick Stock Studio Button */}
            {onOpenStockManager && (
              <button
                onClick={onOpenStockManager}
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-xs font-medium"
                title="Add or update stocks & lot sizes"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xl:inline">Add / Update Stock</span>
              </button>
            )}

            {/* Timeframe Selector (Popular Chips + Full Dropdown) */}
            <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 relative">
              {popularTimeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onSelectTimeframe(tf)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold transition-all ${
                    currentTimeframe === tf
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tf}
                </button>
              ))}

              {/* More Timeframes Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen);
                    setIsSymbolDropdownOpen(false);
                  }}
                  className={`text-xs px-2 py-1 rounded-lg font-mono font-semibold flex items-center space-x-1 transition-all ${
                    !popularTimeframes.includes(currentTimeframe)
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title="More Timeframes"
                >
                  <span>{!popularTimeframes.includes(currentTimeframe) ? currentTimeframe : 'More'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isTimeframeDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsTimeframeDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-36 bg-slate-900/98 backdrop-blur-xl rounded-xl border border-slate-700 shadow-2xl z-50 p-1.5 grid grid-cols-2 gap-1 text-xs">
                      {ALL_TIMEFRAMES.map((tf) => (
                        <button
                          key={tf}
                          onClick={() => {
                            onSelectTimeframe(tf);
                            setIsTimeframeDropdownOpen(false);
                          }}
                          className={`p-1.5 font-mono font-semibold text-center rounded transition-colors ${
                            currentTimeframe === tf
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onSelectTab('radar')}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                activeTab === 'radar'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>8D Radar & Chart</span>
            </button>

            <button
              onClick={() => onSelectTab('calculator')}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                activeTab === 'calculator'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Risk Sizer</span>
            </button>

            <button
              onClick={() => onSelectTab('paper')}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                activeTab === 'paper'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Paper Trading</span>
            </button>

            <button
              onClick={() => onSelectTab('backtest')}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                activeTab === 'backtest'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Backtest Lab</span>
            </button>
          </nav>

          {/* Right Action Cluster: Latency, CSV Upload, Kill Switch */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* CSV Ingest Button */}
            <button
              onClick={onOpenUpload}
              className="hidden sm:flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
              title="Upload Custom CSV Data"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>CSV Ingest</span>
            </button>

            {/* Live Feed Status */}
            <div className="hidden sm:flex items-center space-x-1.5 text-[11px] px-2.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-emerald-300 font-semibold">{latencyMs}ms</span>
            </div>

            {/* Emergency Kill Switch */}
            <button
              onClick={onTriggerKillSwitch}
              className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all shadow-md ${
                isTradingHalted
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xs:inline">{isTradingHalted ? 'HALTED' : 'KILL SWITCH'}</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* 3. Mobile Navigation Drawer & Asset Switcher */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-4 shadow-2xl">
          
          {/* Mobile Symbol Selector Header & Add button */}
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase font-bold text-slate-400">
              Select Active Indian Stock / Index
            </label>
            {onOpenStockManager && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenStockManager();
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Stock</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {categories.flatMap((cat) => cat.symbols).map((sym) => {
              const conf = getSymbolDefaults(sym);
              const isSelected = currentSymbol === sym;
              return (
                <button
                  key={sym}
                  onClick={() => {
                    onSelectSymbol(sym);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-lg text-left border text-xs font-mono font-bold transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 text-white border-indigo-500' 
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{sym}</span>
                    <span className="text-[10px] text-emerald-400">₹{conf.basePrice}</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 block truncate">
                    {conf.displayName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile Timeframe Selector */}
          <div>
            <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Select Timeframe
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {ALL_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    onSelectTimeframe(tf);
                  }}
                  className={`py-1.5 text-center text-xs font-mono font-bold rounded border ${
                    currentTimeframe === tf 
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow' 
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Tab Links */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                onSelectTab('radar');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center space-x-2 p-2.5 rounded-lg text-xs font-semibold ${
                activeTab === 'radar' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>8D Radar & Chart</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('calculator');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center space-x-2 p-2.5 rounded-lg text-xs font-semibold ${
                activeTab === 'calculator' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Risk Sizer</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('paper');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center space-x-2 p-2.5 rounded-lg text-xs font-semibold ${
                activeTab === 'paper' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Paper Trading</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('backtest');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center space-x-2 p-2.5 rounded-lg text-xs font-semibold ${
                activeTab === 'backtest' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Backtest Lab</span>
            </button>
          </div>

        </div>
      )}

      {/* 4. Mobile Bottom Quick Bar for instant tab switching */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 py-2 px-3 z-40 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => onSelectTab('radar')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'radar' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">8D Radar</span>
        </button>

        <button
          onClick={() => onSelectTab('calculator')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'calculator' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Sizer</span>
        </button>

        <button
          onClick={() => onSelectTab('paper')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'paper' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Paper</span>
        </button>

        <button
          onClick={() => onSelectTab('backtest')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'backtest' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Backtest</span>
        </button>
      </div>

    </header>
  );
};
