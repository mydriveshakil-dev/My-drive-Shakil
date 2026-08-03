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
    <header className="pt-4 pb-4 px-4 md:px-8 z-30 relative">
      <GlassContainer
        variant="card"
        blur="3xl"
        className="max-w-7xl mx-auto p-4 sm:p-5 rounded-3xl border-2 border-black shadow-xl bg-white text-slate-900"
      >
        <div className="space-y-4">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/20 pb-3.5">
              <div className="flex items-center gap-3">
                <img
                  src={uaeMessLogo}
                  alt="UAE MESS SYSTEM Logo"
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-black shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black tracking-widest text-slate-700 uppercase">
                      UAE MESS SYSTEM
                    </span>
                    {isAdmin && (
                      <span
                        onClick={onOpenLoginModal}
                        className="inline-flex items-center gap-1 bg-black text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-black shadow-xs cursor-pointer transition-all hover:scale-105"
                        title="Logged in as App Admin"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        APP ADMIN
                      </span>
                    )}
                    {group.isHeld && (
                      <span className="inline-flex items-center gap-1 bg-black text-white font-black text-[10px] px-2 py-0.5 rounded-full border border-black">
                        ON HOLD
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 mt-0.5">
                    {group.name}
                  </h1>
                  {currentUser?.name && (
                    <p className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                      <span>Logged in as:</span>
                      <strong className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-black/30">
                        {currentUser.name}
                      </strong>
                    </p>
                  )}
                </div>
              </div>

            {/* Action buttons on top right */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* PWA Mobile App Setup Button (Available to all) */}
              {onOpenInstallPwa && (
                <button
                  onClick={onOpenInstallPwa}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3 py-1.5 rounded-2xl transition-all shadow-md active:scale-95 border border-black cursor-pointer"
                  title="Mobile App Setup & Home Screen Instructions"
                >
                  <Smartphone className="w-4 h-4 stroke-[2.5]" />
                  <span>Install App</span>
                </button>
              )}

              {/* Admin-only options */}
              {isAdmin && (
                <>
                  {onOpenLoginModal && (
                    <button
                      onClick={onOpenLoginModal}
                      className="inline-flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white text-xs font-black px-3.5 py-1.5 rounded-2xl transition-all shadow-md active:scale-95 border border-black cursor-pointer"
                      title="Member & Admin Account Portal"
                    >
                      <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                      <span>{currentUser?.isLoggedIn ? 'Logged In' : 'Member Login'}</span>
                    </button>
                  )}

                  <button
                    onClick={onOpenCurrencySettings}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-xs text-slate-900 font-bold px-3 py-1.5 rounded-2xl border border-black transition-all active:scale-95 shadow-xs cursor-pointer"
                    title="Change Display Currency & Rates"
                  >
                    <Coins className="w-3.5 h-3.5 text-slate-900" />
                    <span>Currency: {preferredCurrency}</span>
                  </button>

                  <div
                    className="inline-flex items-center gap-1.5 bg-white text-xs text-slate-900 font-bold px-3 py-1.5 rounded-2xl border border-black shadow-xs"
                    title="Backend auto-sync active"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-900 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Auto-Syncing...' : 'Auto-Synced'}</span>
                  </div>

                  <a
                    href={`https://docs.google.com/spreadsheets/d/${group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-2xl border border-black transition-all active:scale-95 shadow-xs cursor-pointer"
                    title="Open Linked Master Google Sheet in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-900" />
                    <span>Google Sheet</span>
                  </a>

                  <button
                    onClick={onOpenArchGuide}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-2xl transition-all border border-black active:scale-95 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5 text-slate-900" />
                    <span>Flutter & API Guide</span>
                  </button>
                </>
              )}

              {/* Top Corner Logout Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white text-xs font-black px-3.5 py-1.5 rounded-2xl transition-all shadow-md border border-black active:scale-95 cursor-pointer"
                  title="Logout Session"
                >
                  <LogOut className="w-4 h-4 stroke-[2.5]" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>

          {/* Second Row: Group Selector + Billing Cycle Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Group Selector Dropdown (Admin only) vs Static Name (Normal Users) */}
            {isAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                  className="flex items-center gap-2 bg-white hover:bg-slate-100 px-4 py-2 rounded-2xl text-xs font-bold border border-black transition-all text-slate-900 shadow-xs cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-slate-900" />
                  <span>Switch Room Group</span>
                  <ChevronDown className={`w-4 h-4 text-slate-900 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showGroupDropdown && (
                  <div className="absolute left-0 mt-2 w-64 bg-white text-slate-900 rounded-3xl shadow-2xl border-2 border-black py-2.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3.5 py-1 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      Active Room Groups ({allGroups.length > 0 ? allGroups.length : 1})
                    </div>
                    {allGroups.length > 0 ? (
                      allGroups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            if (onSelectGroup) onSelectGroup(g);
                            setShowGroupDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center justify-between cursor-pointer ${
                            g.id === group.id ? 'bg-black text-white' : 'hover:bg-slate-100 text-slate-900'
                          }`}
                        >
                          <span className="truncate">{g.name}</span>
                          {g.id === group.id ? (
                            <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded-full font-extrabold shrink-0 border border-black">
                              Active
                            </span>
                          ) : g.isHeld ? (
                            <span className="text-[10px] bg-slate-200 text-black px-2 py-0.5 rounded-full font-extrabold shrink-0 border border-black">
                              Held
                            </span>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => setShowGroupDropdown(false)}
                        className="w-full text-left px-4 py-2.5 bg-black text-white text-xs font-bold flex items-center justify-between"
                      >
                        <span>{group.name}</span>
                        <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded-full font-extrabold">
                          Active
                        </span>
                      </button>
                    )}
                    <div className="border-t border-black/20 my-1"></div>
                    <button
                      onClick={() => {
                        setShowGroupDropdown(false);
                        onOpenAddGroup();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-100 text-xs font-bold text-slate-900 flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add New Room / Group</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl text-xs font-bold border border-black text-slate-900 shadow-xs">
                <span className="text-slate-600 font-medium">Assigned Group:</span>
                <span className="text-slate-900 font-extrabold">{group.name}</span>
              </div>
            )}

            {/* Billing Cycle Toggle: Previous / Current */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center bg-white p-1 rounded-2xl border border-black self-start sm:self-auto">
                <button
                  onClick={() => onToggleCycle('current')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    billingCycleType === 'current'
                      ? 'bg-black text-white shadow-md border border-black'
                      : 'bg-white text-black hover:bg-slate-100'
                  }`}
                >
                  Current Cycle
                </button>
                <button
                  onClick={() => onToggleCycle('previous')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    billingCycleType === 'previous'
                      ? 'bg-black text-white shadow-md border border-black'
                      : 'bg-white text-black hover:bg-slate-100'
                  }`}
                >
                  Previous Cycles
                </button>
              </div>

              {billingCycleType === 'previous' && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPreviousCycle || previousCycleOptions[0]?.cycleId}
                    onChange={(e) => {
                      if (onSelectPreviousCycle) {
                        onSelectPreviousCycle(e.target.value);
                      }
                    }}
                    className="bg-white text-slate-900 font-black text-xs px-3 py-1.5 rounded-xl border border-black focus:outline-none cursor-pointer shadow-xs"
                  >
                    {previousCycleOptions.map((opt) => {
                      const cycleTotal = getCycleTotalExpenses(opt.cycleId);
                      return (
                        <option key={opt.cycleId} value={opt.cycleId}>
                          {opt.label} • ({cycleTotal.toFixed(2)} {group.currency})
                        </option>
                      );
                    })}
                  </select>

                  <div className="bg-black text-white font-black text-xs px-3 py-1.5 rounded-xl border border-black shadow-xs flex items-center gap-1 shrink-0">
                    <span className="text-amber-300 font-extrabold text-[10px] uppercase">Total:</span>
                    <span>{activePreviousCycleTotal.toFixed(2)} {group.currency}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassContainer>
    </header>
  );
};

