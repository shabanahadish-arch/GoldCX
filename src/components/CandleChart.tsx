/**
 * RiskPilot 8D - Real-Time Candlestick Chart Component
 * Powered by Lightweight Charts v5 with Adaptive Zones and Multi-Type Pivot Overlays.
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  HistogramSeries, 
  ColorType, 
  LineStyle,
  IChartApi, 
  ISeriesApi 
} from 'lightweight-charts';
import { Eye, EyeOff, Layers, Compass } from 'lucide-react';
import { Candle } from '../types';

interface CandleChartProps {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  onSelectTimeframe?: (tf: string) => void;
  adaptiveZone?: {
    zone_id: number;
    zone_name: string;
    bias: string;
  };
  pivotLevels?: {
    midpoint?: Record<string, number>;
    camarilla?: Record<string, number>;
    classical?: Record<string, number>;
  };
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  symbol,
  timeframe,
  onSelectTimeframe,
  adaptiveZone,
  pivotLevels,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  const [showPivots, setShowPivots] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [hoverData, setHoverData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: string;
  } | null>(null);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: { color: '#6366f1', width: 1, style: LineStyle.Dotted },
        horzLine: { color: '#6366f1', width: 1, style: LineStyle.Dotted },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay over chart
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });

    chartInstanceRef.current = chart;
    candlestickSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Crosshair move subscription for live inspector
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoverData(null);
        return;
      }
      const candleData = param.seriesData.get(candleSeries) as any;
      const volData = param.seriesData.get(volumeSeries) as any;

      if (candleData) {
        const dateStr = typeof param.time === 'number'
          ? new Date(param.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : String(param.time);

        setHoverData({
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData ? volData.value : 0,
          time: dateStr,
        });
      }
    });

    // Responsive ResizeObserver with requestAnimationFrame debouncing
    let resizeAnimationId: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;

      if (resizeAnimationId !== null) {
        cancelAnimationFrame(resizeAnimationId);
      }
      resizeAnimationId = requestAnimationFrame(() => {
        if (chartInstanceRef.current) {
          chart.applyOptions({ width: Math.floor(width), height: Math.floor(height) });
        }
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      if (resizeAnimationId !== null) {
        cancelAnimationFrame(resizeAnimationId);
      }
      resizeObserver.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, []);

  // Update Data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !candles.length) return;

    // Format candle data
    const chartData = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volData = candles.map((c) => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    }));

    candlestickSeriesRef.current.setData(chartData);
    volumeSeriesRef.current.setData(volData);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [candles]);

  // Update Pivot Lines & Zones
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    // Remove old lines
    priceLinesRef.current.forEach((line) => {
      try {
        candlestickSeriesRef.current?.removePriceLine(line);
      } catch {}
    });
    priceLinesRef.current = [];

    if (showPivots && pivotLevels) {
      // Midpoint Pivot
      if (pivotLevels.midpoint?.pivot) {
        const line = candlestickSeriesRef.current.createPriceLine({
          price: pivotLevels.midpoint.pivot,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'MIDPOINT PIVOT',
        });
        priceLinesRef.current.push(line);
      }

      // Camarilla H4 (Breakout) & L4 (Breakdown)
      if (pivotLevels.camarilla?.h4) {
        const h4Line = candlestickSeriesRef.current.createPriceLine({
          price: pivotLevels.camarilla.h4,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'CAM H4 (LONG BREAKOUT)',
        });
        priceLinesRef.current.push(h4Line);
      }

      if (pivotLevels.camarilla?.h3) {
        const h3Line = candlestickSeriesRef.current.createPriceLine({
          price: pivotLevels.camarilla.h3,
          color: '#34d399',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'CAM H3 (REVERSAL RESISTANCE)',
        });
        priceLinesRef.current.push(h3Line);
      }

      if (pivotLevels.camarilla?.l3) {
        const l3Line = candlestickSeriesRef.current.createPriceLine({
          price: pivotLevels.camarilla.l3,
          color: '#f87171',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'CAM L3 (REVERSAL SUPPORT)',
        });
        priceLinesRef.current.push(l3Line);
      }

      if (pivotLevels.camarilla?.l4) {
        const l4Line = candlestickSeriesRef.current.createPriceLine({
          price: pivotLevels.camarilla.l4,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'CAM L4 (SHORT BREAKOUT)',
        });
        priceLinesRef.current.push(l4Line);
      }
    }
  }, [showPivots, pivotLevels]);

  const latest = candles[candles.length - 1];
  const activeInspection = hoverData || (latest ? {
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close,
    volume: latest.volume,
    time: 'Current',
  } : null);

  const priceDiff = activeInspection ? activeInspection.close - activeInspection.open : 0;
  const pricePct = activeInspection && activeInspection.open > 0 ? (priceDiff / activeInspection.open) * 100 : 0;

  return (
    <div className="relative w-full h-[520px] bg-[#090d16] rounded-xl border border-slate-800 overflow-hidden flex flex-col">
      {/* Top Chart Header & Inspector */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 z-10 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-100 text-sm">{symbol}</span>
            <span className="text-xs text-indigo-400 bg-indigo-950/70 px-2 py-0.5 rounded border border-indigo-800/60 font-mono">
              {timeframe}
            </span>
          </div>

          {activeInspection && (
            <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
              <span className="text-slate-400">O: <strong className="text-slate-200">₹{activeInspection.open.toFixed(2)}</strong></span>
              <span className="text-slate-400">H: <strong className="text-slate-200">₹{activeInspection.high.toFixed(2)}</strong></span>
              <span className="text-slate-400">L: <strong className="text-slate-200">₹{activeInspection.low.toFixed(2)}</strong></span>
              <span className="text-slate-400">C: <strong className={priceDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>₹{activeInspection.close.toFixed(2)}</strong></span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${priceDiff >= 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                {priceDiff >= 0 ? '+' : ''}{pricePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Overlay Controls, Timeframes & Active Zone Badge */}
        <div className="flex items-center space-x-2">
          {onSelectTimeframe && (
            <div className="hidden md:flex items-center space-x-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
              {['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => onSelectTimeframe(tf)}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-all ${
                    timeframe === tf
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}

          {showZones && adaptiveZone && (
            <div className="flex items-center space-x-1.5 text-xs bg-slate-800/90 text-slate-300 px-2 py-1 rounded-md border border-slate-700">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium hidden sm:inline">{adaptiveZone.zone_name}</span>
            </div>
          )}

          {/* Toggle Pivots */}
          <button
            onClick={() => setShowPivots(!showPivots)}
            className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md border transition-colors ${
              showPivots
                ? 'bg-amber-950/50 text-amber-300 border-amber-800/80'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Pivots</span>
          </button>

          {/* Toggle Zones */}
          <button
            onClick={() => setShowZones(!showZones)}
            className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md border transition-colors ${
              showZones
                ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800/80'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zones</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div ref={chartContainerRef} className="w-full flex-1" />
    </div>
  );
};
