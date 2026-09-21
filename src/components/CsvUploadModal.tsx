/**
 * RiskPilot 8D - CSV Historical Data Ingestion Modal
 * Multi-column auto-detection, data hygiene audit, and in-memory cache population.
 */

import React, { useState } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  FileText 
} from 'lucide-react';
import { Candle } from '../types';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (symbol: string, candles: Candle[]) => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const [symbol, setSymbol] = useState<string>('CUSTOM_DATA');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [auditSummary, setAuditSummary] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
      setAuditSummary(null);
    }
  };

  const processCsv = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV file contains insufficient rows.');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Auto-detect columns
      const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('date'));
      const openIdx = headers.findIndex(h => h === 'open' || h.includes('open'));
      const highIdx = headers.findIndex(h => h === 'high' || h.includes('high'));
      const lowIdx = headers.findIndex(h => h === 'low' || h.includes('low'));
      const closeIdx = headers.findIndex(h => h === 'close' || h.includes('close'));
      const volIdx = headers.findIndex(h => h === 'volume' || h === 'vol' || h.includes('vol'));

      if (timeIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
        throw new Error('Required OHLC columns not found. Headers detected: ' + headers.join(', '));
      }

      const candles: Candle[] = [];
      let corruptRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length <= Math.max(timeIdx, openIdx, highIdx, lowIdx, closeIdx)) {
          corruptRows++;
          continue;
        }

        const rawTime = parts[timeIdx];
        let timestampSec = Math.floor(new Date(rawTime).getTime() / 1000);
        if (isNaN(timestampSec)) {
          timestampSec = Math.floor(Date.now() / 1000) - (lines.length - i) * 300;
        }

        const open = parseFloat(parts[openIdx]);
        const high = parseFloat(parts[highIdx]);
        const low = parseFloat(parts[lowIdx]);
        const close = parseFloat(parts[closeIdx]);
        const volume = volIdx !== -1 ? parseFloat(parts[volIdx]) || 100 : 100;

        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || low > high) {
          corruptRows++;
          continue;
        }

        candles.push({
          time: timestampSec,
          open,
          high,
          low,
          close,
          volume,
          isComplete: true,
        });
      }

      if (candles.length < 10) {
        throw new Error(`Only ${candles.length} valid candles parsed. At least 10 valid rows required.`);
      }

      // Sort by time ascending
      candles.sort((a, b) => (a.time as number) - (b.time as number));

      setAuditSummary({
        total_rows: lines.length - 1,
        parsed_candles: candles.length,
        corrupt_rows: corruptRows,
        detected_headers: headers,
      });

      onDataLoaded(symbol.toUpperCase(), candles);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-sm">Upload Historical OHLCV CSV</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Target Symbol Identifier</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-100 uppercase"
              placeholder="e.g. NIFTY, BTCUSDT, EURUSD"
            />
          </div>

          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center transition-colors bg-slate-950/50">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              id="csv-file-input"
              className="hidden"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
              <FileText className="w-8 h-8 text-indigo-400 mx-auto" />
              <div className="text-xs text-slate-300 font-medium">
                {file ? file.name : 'Click to select or drag CSV file'}
              </div>
              <p className="text-[11px] text-slate-500">
                Supports Standard OHLCV (Time/Date, Open, High, Low, Close, Volume)
              </p>
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 text-xs bg-rose-950/50 text-rose-300 p-3 rounded-lg border border-rose-800/80">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {auditSummary && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
            <div className="flex items-center space-x-1 text-emerald-400 font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Data Ingested Successfully</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Valid Candles:</span>
              <strong className="text-slate-200">{auditSummary.parsed_candles}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Skipped/Corrupt Rows:</span>
              <span className="text-amber-400">{auditSummary.corrupt_rows}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={processCsv}
            disabled={!file || isProcessing}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Ingesting...' : 'Ingest & Chart'}
          </button>
        </div>

      </div>
    </div>
  );
};
