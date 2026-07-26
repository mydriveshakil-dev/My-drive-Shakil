import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in">
      <GlassContainer
        variant="modal"
        blur="3xl"
        className="max-w-lg w-full shadow-2xl border border-white/40 overflow-hidden flex flex-col max-h-[90vh] rounded-3xl"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0B4A3F] to-[#145C4E] text-white px-6 py-5 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F9A826] text-[#0B4A3F] flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Currency & Conversion Settings</h2>
              <p className="text-xs text-emerald-200">Set preferred display currency & custom rates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-full hover:bg-emerald-800/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Currency Summary Banner */}
        <div className="bg-white/10 border-b border-white/20 px-6 py-3 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <Info className="w-4 h-4 text-[#F9A826]" />
            <span>
              Base Room Currency: <strong>{baseCurrency}</strong>
            </span>
          </div>
          <div className="text-xs font-bold text-white bg-[#F9A826] text-[#0B4A3F] px-3 py-1 rounded-xl shadow-xs border border-white/40">
            Display: {selectedCurrencyInfo.code} ({selectedCurrencyInfo.symbol})
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Explanation */}
          <div className="text-xs text-emerald-100/90 bg-white/10 p-3.5 rounded-2xl border border-white/20 leading-relaxed backdrop-blur-xl">
            Expenses are recorded in <strong>{baseCurrency}</strong>.
            Selecting a preferred currency below automatically converts and displays amounts across all dashboards and reports.
          </div>

          {/* Search & Reset */}
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search currency (USD, INR, EUR, BDT...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white/10 border border-white/25 rounded-xl text-xs font-medium text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={() => {
                if (onResetRates) onResetRates();
                triggerHaptic(hapticPatterns.click);
              }}
              className="px-3 py-2.5 text-xs text-white hover:text-[#F9A826] font-semibold flex items-center gap-1 hover:bg-white/10 rounded-xl transition-colors border border-white/20 cursor-pointer"
              title="Reset rates to standard defaults"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#F9A826]" />
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
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between backdrop-blur-2xl cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/35 border-amber-400 shadow-lg ring-1 ring-amber-400/50'
                      : 'bg-white/10 border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm ${
                        isSelected ? 'bg-[#F9A826] text-[#0B4A3F]' : 'bg-white/15 text-white'
                      }`}
                    >
                      {curr.symbol}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{curr.code}</span>
                        <span className="text-xs text-emerald-200/80 font-medium">— {curr.name}</span>
                        {isBase && (
                          <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-semibold uppercase border border-white/20">
                            Base
                          </span>
                        )}
                        {isCustom && (
                          <span className="text-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/40 px-1.5 py-0.2 rounded font-semibold">
                            Custom Rate
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-200/80 mt-0.5">
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
                              className="w-20 px-2 py-1 border border-amber-400 rounded-lg text-xs font-bold bg-slate-900 text-white focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveRate(curr.code)}
                              className="p-1 bg-[#F9A826] text-[#0B4A3F] rounded-lg text-xs font-black cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(curr)}
                            className="p-1.5 text-emerald-200/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
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
                          ? 'bg-[#F9A826] text-[#0B4A3F] shadow-md'
                          : 'border border-white/30 text-transparent hover:border-white'
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
        <div className="p-4 bg-white/10 border-t border-white/20 flex items-center justify-between backdrop-blur-md">
          <div className="text-xs text-emerald-100">
            Current Selected: <strong className="text-[#F9A826]">{preferredCurrency}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 border border-white/30 cursor-pointer"
          >
            Apply & Done
          </button>
        </div>
      </GlassContainer>
    </div>
  );
};
