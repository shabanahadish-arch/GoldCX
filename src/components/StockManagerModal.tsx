/**
 * Suparnova CX - Stock & Asset Studio Modal
 * Allows traders to browse sector-wise Indian stocks, select active pairs,
 * add new Indian stocks with custom parameters, and update existing stock configs.
 */

import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Search, 
  Edit3, 
  RotateCcw, 
  Check, 
  Building2, 
  TrendingUp, 
  Sliders, 
  Sparkles,
  Trash2,
  Layers
} from 'lucide-react';
import { 
  SYMBOL_CONFIGS, 
  getAllActiveCategories, 
  getSymbolDefaults, 
  saveCustomStock, 
  updateStockConfig, 
  deleteCustomStock, 
  resetAllStocksToDefault,
  SymbolConfig 
} from '../services/mockData';

interface StockManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onStocksUpdated: () => void;
}

export const StockManagerModal: React.FC<StockManagerModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  onSelectSymbol,
  onStocksUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'add' | 'update'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Add Stock Form State
  const [newSymbol, setNewSymbol] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newCategory, setNewCategory] = useState('IND_EQUITY');
  const [newBasePrice, setNewBasePrice] = useState<number>(1000);
  const [newLotSize, setNewLotSize] = useState<number>(100);
  const [newTickSize, setNewTickSize] = useState<number>(0.05);
  const [newVolatilityPct, setNewVolatilityPct] = useState<number>(0.35);
  const [newAssetClass, setNewAssetClass] = useState<'EQUITY' | 'INDEX'>('EQUITY');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Update Stock Form State
  const [editingSymbol, setEditingSymbol] = useState<string>(currentSymbol);
  const [editPrice, setEditPrice] = useState<number>(getSymbolDefaults(currentSymbol).basePrice);
  const [editLot, setEditLot] = useState<number>(getSymbolDefaults(currentSymbol).lotSize);
  const [editVol, setEditVol] = useState<number>(getSymbolDefaults(currentSymbol).volatilityPct * 100);
  const [editName, setEditName] = useState<string>(getSymbolDefaults(currentSymbol).displayName);

  if (!isOpen) return null;

  const categories = getAllActiveCategories();

  const handleSelectSymbol = (sym: string) => {
    onSelectSymbol(sym);
    onClose();
  };

  const handleStartEdit = (sym: string) => {
    const config = getSymbolDefaults(sym);
    setEditingSymbol(sym);
    setEditPrice(config.basePrice);
    setEditLot(config.lotSize);
    setEditVol(config.volatilityPct * 100);
    setEditName(config.displayName);
    setActiveTab('update');
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const sym = newSymbol.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    const stockConfig: SymbolConfig = {
      basePrice: Number(newBasePrice) || 100,
      tickSize: Number(newTickSize) || 0.05,
      lotSize: Number(newLotSize) || 50,
      assetClass: newAssetClass,
      currency: 'INR',
      volatilityPct: (Number(newVolatilityPct) || 0.35) / 100,
      vixBenchmark: 15.0,
      displayName: newDisplayName.trim() || `${sym} Equity`,
      category: newCategory,
      isCustom: true,
    };

    saveCustomStock(sym, stockConfig);
    onStocksUpdated();
    setFormSuccess(`Added ${sym} successfully!`);
    setTimeout(() => {
      setFormSuccess(null);
      onSelectSymbol(sym);
      onClose();
    }, 900);
  };

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    updateStockConfig(editingSymbol, {
      basePrice: Number(editPrice),
      lotSize: Number(editLot),
      volatilityPct: (Number(editVol) || 0.35) / 100,
      displayName: editName.trim(),
    });
    onStocksUpdated();
    setFormSuccess(`Updated ${editingSymbol} parameters!`);
    setTimeout(() => {
      setFormSuccess(null);
      if (editingSymbol === currentSymbol) {
        onSelectSymbol(editingSymbol);
      }
      setActiveTab('browse');
    }, 800);
  };

  const handleDeleteCustom = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove custom stock ${sym}?`)) {
      deleteCustomStock(sym);
      onStocksUpdated();
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all custom stock parameters to official NSE defaults?')) {
      resetAllStocksToDefault();
      onStocksUpdated();
      onSelectSymbol('NIFTY');
    }
  };

  // Filter symbols based on category & search
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    symbols: cat.symbols.filter((sym) => {
      if (selectedCategory !== 'ALL' && cat.id !== selectedCategory) return false;
      const conf = getSymbolDefaults(sym);
      const q = searchQuery.toLowerCase();
      return (
        sym.toLowerCase().includes(q) ||
        (conf.displayName && conf.displayName.toLowerCase().includes(q))
      );
    }),
  })).filter((cat) => cat.symbols.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white font-sans">
                  Suparnova <span className="text-indigo-400">CX</span> Stock Studio
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  NSE & BSE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Market-wise Indian equities, benchmark indices, and custom asset manager
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-semibold">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'browse'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Browse Market Sectors</span>
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'add'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Stock</span>
            </button>

            <button
              onClick={() => setActiveTab('update')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'update'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Stock Config</span>
            </button>
          </div>

          <button
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-slate-800/80 transition-colors"
            title="Reset any custom modifications back to official default values"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-200">
          
          {/* TAB 1: BROWSE & SELECT MARKET-WISE */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Indian stocks (e.g. NIFTY, RELIANCE, TCS, TATAMOTORS, HDFCBANK)..."
                    className="w-full bg-slate-950 text-sm text-slate-100 pl-9 pr-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Market Sectors</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Categorized Stock Grid */}
              <div className="space-y-6 pt-2">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-normal">
                        ({cat.symbols.length} assets)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {cat.symbols.map((sym) => {
                        const conf = getSymbolDefaults(sym);
                        const isSelected = currentSymbol === sym;

                        return (
                          <div
                            key={sym}
                            onClick={() => handleSelectSymbol(sym)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between group ${
                              isSelected
                                ? 'bg-indigo-950/80 border-indigo-500/80 shadow-md shadow-indigo-900/40'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-mono font-black text-sm text-white">{sym}</span>
                                  {conf.isCustom && (
                                    <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-700/60 px-1.5 rounded">
                                      CUSTOM
                                    </span>
                                  )}
                                  {conf.assetClass === 'INDEX' && (
                                    <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-700/60 px-1.5 rounded">
                                      INDEX
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                  {conf.displayName}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(sym);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
                                  title="Edit Stock Parameters"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {conf.isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCustom(sym, e)}
                                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                    title="Delete custom stock"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-850 text-xs font-mono">
                              <span className="text-slate-400 text-[11px]">
                                Lot: <strong className="text-slate-300">{conf.lotSize}</strong>
                              </span>
                              <span className="text-emerald-400 font-bold text-sm">
                                ₹{conf.basePrice.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredCategories.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-sm">No stocks found matching "{searchQuery}"</p>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add "{searchQuery.toUpperCase()}" as New Stock</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADD NEW INDIAN STOCK */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddStock} className="max-w-xl mx-auto space-y-4 py-2">
              <div className="bg-indigo-950/40 border border-indigo-900/50 p-3.5 rounded-xl text-xs text-indigo-300 flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Adding a custom stock dynamically creates its real-time price feeds, 8D risk matrix,
                  adaptive zones, and Camarilla pivot levels.
                </span>
              </div>

              {formSuccess && (
                <div className="bg-emerald-950/80 border border-emerald-700 p-3 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    NSE / BSE Symbol *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. ZOMATO, TRENT, BEL"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Asset Class
                  </label>
                  <select
                    value={newAssetClass}
                    onChange={(e) => setNewAssetClass(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="EQUITY">Indian Equity Stock</option>
                    <option value="INDEX">Market Index</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Company / Asset Display Name
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Zomato Limited"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Market Sector / Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="IND_INDICES">Benchmark Indices</option>
                    <option value="IND_BANK">Banking & Financials</option>
                    <option value="IND_IT">Information Technology (IT)</option>
                    <option value="IND_ENERGY">Energy, Oil & Power</option>
                    <option value="IND_AUTO">Automobile & Mobility</option>
                    <option value="IND_METALS">Metals & Mining</option>
                    <option value="IND_FMCG">FMCG & Consumer</option>
                    <option value="IND_PHARMA">Pharmaceuticals & Healthcare</option>
                    <option value="IND_INFRA">Infrastructure & Conglomerates</option>
                    <option value="CUSTOM_STOCKS">Custom / Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Base Reference Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Lot Size
                  </label>
                  <input
                    type="number"
                    value={newLotSize}
                    onChange={(e) => setNewLotSize(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tick Size (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTickSize}
                    onChange={(e) => setNewTickSize(parseFloat(e.target.value) || 0.05)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Volatility % (bar)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={newVolatilityPct}
                    onChange={(e) => setNewVolatilityPct(parseFloat(e.target.value) || 0.35)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Stock & Launch in Terminal</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: UPDATE EXISTING STOCK CONFIG */}
          {activeTab === 'update' && (
            <form onSubmit={handleUpdateStock} className="max-w-xl mx-auto space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Select Stock to Update
                </label>
                <select
                  value={editingSymbol}
                  onChange={(e) => handleStartEdit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                >
                  {Object.keys(SYMBOL_CONFIGS).map((sym) => (
                    <option key={sym} value={sym}>
                      {sym} — {getSymbolDefaults(sym).displayName}
                    </option>
                  ))}
                </select>
              </div>

              {formSuccess && (
                <div className="bg-emerald-950/80 border border-emerald-700 p-3 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Current Base Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Contract Lot Size
                  </label>
                  <input
                    type="number"
                    required
                    value={editLot}
                    onChange={(e) => setEditLot(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Expected Base Volatility % per Bar
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={editVol}
                  onChange={(e) => setEditVol(parseFloat(e.target.value) || 0.2)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Scales the candle ranges and ATR calculations dynamically for this asset.
                </p>
              </div>

              <div className="pt-3 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Stock Parameters</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">
            Active Asset: <strong className="text-indigo-300">{currentSymbol}</strong> (₹{getSymbolDefaults(currentSymbol).basePrice.toLocaleString()})
          </span>
          <span>Suparnova CX Indian Trading Terminal</span>
        </div>
      </div>
    </div>
  );
};
