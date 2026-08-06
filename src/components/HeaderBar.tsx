import React, { useState } from 'react';
import { Group, GoogleSheetsConfig, BillingCycleType, UserAuthProfile, Expense } from '../types';
import { ChevronDown, RefreshCw, Layers, Plus, Code, CheckCircle2, Coins, ShieldCheck, LogOut, ExternalLink, Smartphone } from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import uaeMessLogo from '../assets/images/uae_mess_logo_1785022712689.jpg';
import { getPreviousCycleOptions } from '../utils/cycleUtils';

interface HeaderBarProps {
  group: Group;
  allGroups?: Group[];
  onSelectGroup?: (group: Group) => void;
  billingCycleType: BillingCycleType;
  onToggleCycle: (type: BillingCycleType) => void;
  selectedPreviousCycle?: string;
  onSelectPreviousCycle?: (cycleId: string) => void;
  expenses?: Expense[];
  sheetsConfig: GoogleSheetsConfig;
  onSyncNow: () => void;
  onOpenAddGroup: () => void;
  onOpenArchGuide: () => void;
  isSyncing: boolean;
  preferredCurrency: string;
  onOpenCurrencySettings: () => void;
  currentUser?: UserAuthProfile | null;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onOpenInstallPwa?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  group,
  allGroups = [],
  onSelectGroup,
  billingCycleType,
  onToggleCycle,
  selectedPreviousCycle,
  onSelectPreviousCycle,
  expenses = [],
  sheetsConfig,
  onSyncNow,
  onOpenAddGroup,
  onOpenArchGuide,
  isSyncing,
  preferredCurrency,
  onOpenCurrencySettings,
  currentUser,
  onOpenLoginModal,
  onLogout,
  onOpenInstallPwa,
}) => {
  const previousCycleOptions = getPreviousCycleOptions(24, group?.createdAt);
  const isAdmin = currentUser?.role === 'admin';
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  // Helper to calculate total expenses for a specific cycleId
  const getCycleTotalExpenses = (cId: string) => {
    return expenses
      .filter((e) => {
        const expCycle = e.cycle || (e.date ? e.date.slice(0, 7) : '');
        return expCycle === cId;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const activeSelectedPreviousCycleId = selectedPreviousCycle || previousCycleOptions[0]?.cycleId || '2026-06';
  const activePreviousCycleTotal = getCycleTotalExpenses(activeSelectedPreviousCycleId);

  return (
    <header className="mb-4 z-30 relative w-full">
      {/* Combined Single Header Card */}
      <div className="bg-gradient-to-b from-[#07193F] to-[#041029] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800/80 relative overflow-hidden space-y-4">
        {/* Burj Khalifa Background SVG */}
        <div className="absolute right-0 bottom-0 top-0 w-48 sm:w-64 opacity-25 pointer-events-none flex items-end justify-end pr-2 overflow-hidden">
          <svg className="h-44 sm:h-52 w-auto text-white" viewBox="0 0 120 220" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M60 5 V220 M60 5 L58 25 H62 L60 5 M58 25 V50 M62 25 V50 M55 50 H65 M55 50 V80 M65 50 V80 M51 80 H69 M51 80 V110 M69 80 V110 M47 110 H73 M47 110 V145 M73 110 V145 M42 145 H78 M42 145 V180 M78 145 V180 M36 180 H84 M36 180 V220 M84 180 V220" />
            <line x1="57" y1="35" x2="63" y2="35" />
            <line x1="54" y1="65" x2="66" y2="65" />
            <line x1="50" y1="95" x2="70" y2="95" />
            <line x1="45" y1="128" x2="75" y2="128" />
            <line x1="40" y1="162" x2="80" y2="162" />
            <line x1="34" y1="198" x2="86" y2="198" />
            <path d="M36 220 V190 H42 V160 H47 V125 H51 V90 H55 V60 H58 V30 H60" />
            <path d="M84 220 V190 H78 V160 H73 V125 H69 V90 H65 V60 H62 V30 H60" />
          </svg>
        </div>

        {/* Absolute Top-Right Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#0A204C]/90 hover:bg-rose-600/90 active:scale-95 text-white flex items-center justify-center transition-all border border-blue-400/30 cursor-pointer shadow-md"
            title="Logout Session"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>
        )}

        <div className="relative z-10 space-y-4">
          {/* Header Row: Logo + Info + Assigned Group & Admin Portal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pr-10 sm:pr-12">
            <div className="flex items-center gap-3">
              <div className="p-0.5 bg-white rounded-2xl shadow-md border-2 border-white/80 shrink-0">
                <img
                  src={uaeMessLogo}
                  alt="UAE MESS SYSTEM Logo"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover"
                />
              </div>

              <div>
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-blue-200/90 uppercase block">
                  UAE MESS SYSTEM
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5 flex items-center gap-2">
                  {group.name}
                  {group.isHeld && (
                    <span className="inline-flex items-center bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                      ON HOLD
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-blue-100/70 font-medium">Logged in as:</span>
                  <span className="inline-flex items-center gap-1 bg-[#0B2A66]/90 border border-blue-400/30 text-blue-200 font-bold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-xs">
                    {currentUser?.name || 'AL AMIN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Right Action Area: Assigned Group Selector & Admin Portal */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Assigned Group Selector */}
              <div className="flex items-center gap-2 bg-[#0B2556]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-blue-400/30 text-xs">
                <span className="text-blue-200/80 font-medium whitespace-nowrap">Assigned Group:</span>
                {isAdmin ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                      className="flex items-center gap-1.5 font-bold text-white hover:text-blue-200 transition-all cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span className="max-w-[120px] sm:max-w-[160px] truncate">{group.name}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-blue-300 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showGroupDropdown && (
                      <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Active Room Groups
                        </div>
                        {allGroups.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => {
                              if (onSelectGroup) onSelectGroup(g);
                              setShowGroupDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center justify-between cursor-pointer ${
                              g.id === group.id ? 'bg-[#0052FF] text-white' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <span className="truncate">{g.name}</span>
                            {g.id === group.id && (
                              <span className="text-[10px] bg-white text-[#0052FF] px-2 py-0.5 rounded-full font-extrabold">
                                Active
                              </span>
                            )}
                          </button>
                        ))}
                        <div className="border-t border-slate-100 my-1"></div>
                        <button
                          onClick={() => {
                            setShowGroupDropdown(false);
                            onOpenAddGroup();
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-[#0052FF] flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Add New Room / Group</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-white font-bold text-xs">{group.name}</span>
                )}
              </div>

              {/* Admin Portal Button */}
              {isAdmin && onOpenLoginModal && (
                <button
                  onClick={onOpenLoginModal}
                  className="inline-flex items-center gap-1.5 bg-[#0B2A66]/90 hover:bg-[#0E347E] text-white text-xs font-bold px-3 py-2 rounded-2xl border border-blue-400/30 transition-all cursor-pointer shadow-xs"
                  title="Member & Admin Account Portal"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                  <span>{currentUser?.isLoggedIn ? 'Admin Portal' : 'Login'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Admin Tools Row (if admin) */}
          {isAdmin && (
            <div className="pt-2 border-t border-white/10 flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={onOpenCurrencySettings}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-medium px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5 text-blue-300" />
                <span>Currency: {preferredCurrency}</span>
              </button>

              <div className="inline-flex items-center gap-1.5 bg-white/10 text-blue-200 font-medium px-3 py-1.5 rounded-xl border border-white/20">
                <RefreshCw className={`w-3.5 h-3.5 text-blue-300 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Synced'}</span>
              </div>

              <a
                href={`https://docs.google.com/spreadsheets/d/${group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}/edit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-medium px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
                <span>Google Sheet</span>
              </a>

              <button
                onClick={onOpenArchGuide}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-medium px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-blue-300" />
                <span>API Guide</span>
              </button>
            </div>
          )}

          {/* Billing Cycle Switch Row */}
          <div className="pt-3 border-t border-white/15 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B2556]/80 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-blue-400/20">
              <span className="text-xs text-blue-200/90 font-bold hidden sm:inline">Billing Cycle View:</span>
              <div className="bg-[#07193F]/90 p-1 rounded-xl border border-blue-400/25 inline-flex items-center gap-1 w-full sm:w-auto">
                <button
                  onClick={() => onToggleCycle('current')}
                  className={`flex-1 sm:flex-none py-1.5 px-4 rounded-lg text-xs font-extrabold transition-all text-center cursor-pointer ${
                    billingCycleType === 'current'
                      ? 'bg-[#0052FF] text-white shadow-md shadow-blue-500/30'
                      : 'text-blue-200/80 hover:text-white bg-transparent'
                  }`}
                >
                  Current Cycle
                </button>
                <button
                  onClick={() => onToggleCycle('previous')}
                  className={`flex-1 sm:flex-none py-1.5 px-4 rounded-lg text-xs font-extrabold transition-all text-center cursor-pointer ${
                    billingCycleType === 'previous'
                      ? 'bg-[#0052FF] text-white shadow-md shadow-blue-500/30'
                      : 'text-blue-200/80 hover:text-white bg-transparent'
                  }`}
                >
                  Previous Cycles
                </button>
              </div>
            </div>

            {billingCycleType === 'previous' && (
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={activeSelectedPreviousCycleId}
                  onChange={(e) => {
                    if (onSelectPreviousCycle) {
                      onSelectPreviousCycle(e.target.value);
                    }
                  }}
                  className="w-full bg-[#0B2556] text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-blue-400/30 focus:outline-none focus:border-[#0052FF] cursor-pointer"
                >
                  {previousCycleOptions.map((opt) => {
                    const cycleTotal = getCycleTotalExpenses(opt.cycleId);
                    return (
                      <option key={opt.cycleId} value={opt.cycleId} className="bg-[#07193F] text-white">
                        {opt.label} • ({cycleTotal.toFixed(2)} {group.currency})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

