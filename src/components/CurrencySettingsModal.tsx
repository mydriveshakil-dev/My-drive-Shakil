import React, { useState, useEffect } from 'react';
import { DEFAULT_CURRENCIES, CurrencyInfo } from '../utils/currency';
import { X, RefreshCw, Check, ArrowRightLeft, SlidersHorizontal, Info } from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface CurrencySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseCurrency: string;
  preferredCurrency: string;
  onSelectPreferredCurrency: (code: string) => void;
  customRates: Record<string, number>;
  onUpdateCustomRate: (code: string, rate: number) => void;
  onResetRates: () => void;
  onChangeBaseCurrency?: (code: string) => void;
}

export const CurrencySettingsModal: React.FC<CurrencySettingsModalProps> = ({
  isOpen,
  onClose,
  baseCurrency = 'AED',
  preferredCurrency = 'USD',
  onSelectPreferredCurrency,
  customRates = {},
  onUpdateCustomRate,
  onResetRates,
  onChangeBaseCurrency,
}) => {
  const [search, setSearch] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCurrencies = DEFAULT_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCurrencyInfo =
    DEFAULT_CURRENCIES.find((c) => c.code === preferredCurrency) || DEFAULT_CURRENCIES[1];

  const handleSelect = (code: string) => {
    triggerHaptic(hapticPatterns.success);
    if (onSelectPreferredCurrency) {
      onSelectPreferredCurrency(code);
    }
  };

  const handleStartEdit = (curr: CurrencyInfo) => {
    setEditingCode(curr.code);
    const activeRate = customRates[curr.code] ?? curr.rateFromAED;
    setTempRate(activeRate.toString());
  };

  const handleSaveRate = (code: string) => {
    const num = parseFloat(tempRate);
    if (!isNaN(num) && num > 0 && onUpdateCustomRate) {
      onUpdateCustomRate(code, num);
      triggerHaptic(hapticPatterns.click);
    }
    setEditingCode(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <GlassContainer
        variant="modal"
        blur="3xl"
        className="max-w-lg w-full shadow-2xl border-2 border-black bg-white text-slate-900 overflow-hidden flex flex-col max-h-[90vh] rounded-3xl"
      >
        {/* Modal Header */}
        <div className="bg-white text-slate-900 px-6 py-5 flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Currency & Conversion Settings</h2>
              <p className="text-xs text-slate-700 font-medium">Set preferred display currency & custom rates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-black p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border border-black"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Currency Summary Banner */}
        <div className="bg-slate-100 border-b border-black px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Info className="w-4 h-4 text-slate-900" />
            <span>
              Base Room Currency: <strong className="text-slate-950">{baseCurrency}</strong>
            </span>
          </div>
          <div className="text-xs font-black text-white bg-black px-3 py-1 rounded-xl shadow-xs border border-black">
            Display: {selectedCurrencyInfo.code} ({selectedCurrencyInfo.symbol})
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-900">
          {/* Quick Explanation */}
          <div className="text-xs text-slate-900 bg-slate-50 p-3.5 rounded-2xl border border-black leading-relaxed font-medium">
            Expenses are recorded in <strong className="text-slate-950">{baseCurrency}</strong>.
            Selecting a preferred currency below automatically converts and displays amounts across all dashboards and reports.
          </div>

          {/* Search & Reset */}
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search currency (USD, INR, EUR, BDT...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white border border-black rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={() => {
                if (onResetRates) onResetRates();
                triggerHaptic(hapticPatterns.click);
              }}
              className="px-3 py-2.5 text-xs text-slate-900 hover:text-black font-extrabold flex items-center gap-1 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-black cursor-pointer shadow-xs"
              title="Reset rates to standard defaults"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-900" />
              <span>Reset</span>
            </button>
          </div>

          {/* Currency List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredCurrencies.map((curr) => {
              const isSelected = curr.code === preferredCurrency;
              const isBase = curr.code === baseCurrency;
              const activeRate = customRates[curr.code] ?? curr.rateFromAED;
              const isCustom = customRates[curr.code] !== undefined;

              return (
                <div
                  key={curr.code}
                  onClick={() => handleSelect(curr.code)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-2 border-black shadow-md'
                      : 'bg-white text-slate-900 border border-black hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm border ${
                        isSelected ? 'bg-white text-slate-950 border-white' : 'bg-slate-100 text-slate-900 border-black'
                      }`}
                    >
                      {curr.symbol}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm ${isSelected ? 'text-white' : 'text-slate-950'}`}>{curr.code}</span>
                        <span className={`text-xs font-medium ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>— {curr.name}</span>
                        {isBase && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase border ${isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-slate-200 text-slate-900 border-black'}`}>
                            Base
                          </span>
                        )}
                        {isCustom && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${isSelected ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 text-white border-black'}`}>
                            Custom Rate
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] font-medium mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                        1 {baseCurrency} = {activeRate} {curr.code}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {!isBase && (
                      <div>
                        {editingCode === curr.code ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.0001"
                              value={tempRate}
                              onChange={(e) => setTempRate(e.target.value)}
                              className="w-20 px-2 py-1 border border-black rounded-lg text-xs font-bold bg-white text-slate-900 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveRate(curr.code)}
                              className="p-1 bg-black text-white rounded-lg text-xs font-black cursor-pointer border border-black"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(curr)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isSelected ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`}
                            title="Edit Conversion Rate"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleSelect(curr.code)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-slate-950 shadow-md border border-white'
                          : 'border border-black text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t-2 border-black flex items-center justify-between">
          <div className="text-xs text-slate-900 font-bold">
            Current Selected: <strong className="text-slate-950 font-black">{preferredCurrency}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 border border-black cursor-pointer uppercase tracking-wider"
          >
            Apply & Done
          </button>
        </div>
      </GlassContainer>
    </div>
  );
};
