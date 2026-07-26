import React, { useState } from 'react';
import { Group, GoogleSheetsConfig, BillingCycleType, UserAuthProfile } from '../types';
import { ChevronDown, RefreshCw, Layers, Plus, Code, CheckCircle2, Coins, ShieldCheck, LogOut, ExternalLink } from 'lucide-react';
import { GlassContainer } from './GlassContainer';

interface HeaderBarProps {
  group: Group;
  allGroups?: Group[];
  onSelectGroup?: (group: Group) => void;
  billingCycleType: BillingCycleType;
  onToggleCycle: (type: BillingCycleType) => void;
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
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  group,
  allGroups = [],
  onSelectGroup,
  billingCycleType,
  onToggleCycle,
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
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  return (
    <header className="pt-4 pb-4 px-4 md:px-8 z-30 relative">
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="max-w-7xl mx-auto p-4 sm:p-5 rounded-3xl border border-white/30 shadow-2xl shadow-[#0B4A3F]/30"
      >
        <div className="space-y-4">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-3.5">
              <div className="flex items-center gap-3">
                <img
                  src="/src/assets/images/uae_mess_logo_1785022712689.jpg"
                  alt="UAE MESS SYSTEM Logo"
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-400/80 shadow-lg shadow-amber-500/20"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
                      UAE MESS SYSTEM
                    </span>
                    {isAdmin ? (
                      <span
                        onClick={onOpenLoginModal}
                        className="inline-flex items-center gap-1 bg-amber-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-white/40 shadow-md cursor-pointer transition-all"
                        title="Logged in as App Admin"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        APP ADMIN
                      </span>
                    ) : (
                      <span
                        onClick={onOpenLoginModal}
                        className="inline-flex items-center gap-1 bg-white/15 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20"
                      >
                        Member Mode
                      </span>
                    )}
                    {group.isHeld && (
                      <span className="inline-flex items-center gap-1 bg-amber-500/80 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full border border-amber-300">
                        ON HOLD
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 drop-shadow-sm mt-0.5">
                    {group.name}
                  </h1>
                </div>
              </div>

            {/* Action buttons on top right */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Admin-only options */}
              {isAdmin && (
                <>
                  {onOpenLoginModal && (
                    <button
                      onClick={onOpenLoginModal}
                      className="inline-flex items-center gap-1.5 bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] text-xs font-black px-3.5 py-1.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 border border-white/40"
                      title="Member & Admin Account Portal"
                    >
                      <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                      <span>{currentUser?.isLoggedIn ? 'Logged In' : 'Member Login'}</span>
                    </button>
                  )}

                  <button
                    onClick={onOpenCurrencySettings}
                    className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-xs text-amber-300 font-bold px-3 py-1.5 rounded-2xl border border-amber-400/40 backdrop-blur-xl transition-all active:scale-95 shadow-xs"
                    title="Change Display Currency & Rates"
                  >
                    <Coins className="w-3.5 h-3.5 text-[#F9A826]" />
                    <span>Currency: {preferredCurrency}</span>
                  </button>

                  <div
                    className="inline-flex items-center gap-1.5 bg-emerald-950/60 text-xs text-emerald-200 font-bold px-3 py-1.5 rounded-2xl border border-emerald-400/40 backdrop-blur-xl shadow-xs"
                    title="Backend auto-sync active"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Auto-Syncing...' : 'Auto-Synced'}</span>
                  </div>

                  <a
                    href={`https://docs.google.com/spreadsheets/d/${group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-2xl border border-emerald-400/50 backdrop-blur-xl transition-all active:scale-95 shadow-md cursor-pointer"
                    title="Open Linked Master Google Sheet in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#F9A826]" />
                    <span>Google Sheet</span>
                  </a>

                  <button
                    onClick={onOpenArchGuide}
                    className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-2xl transition-all border border-white/20 active:scale-95 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5 text-[#F9A826]" />
                    <span>Flutter & API Guide</span>
                  </button>
                </>
              )}



              {/* Top Corner Logout Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-black px-3.5 py-1.5 rounded-2xl transition-all shadow-lg border border-rose-400/50 active:scale-95 cursor-pointer"
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
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2 rounded-2xl text-xs font-bold border border-white/30 backdrop-blur-xl transition-all text-white shadow-xs"
                >
                  <Layers className="w-4 h-4 text-[#F9A826]" />
                  <span>Switch Room Group</span>
                  <ChevronDown className={`w-4 h-4 text-emerald-200 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showGroupDropdown && (
                  <div className="absolute left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-2xl text-white rounded-3xl shadow-2xl border border-white/20 py-2.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3.5 py-1 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
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
                          className="w-full text-left px-4 py-2 hover:bg-white/10 text-xs font-bold flex items-center justify-between text-white cursor-pointer"
                        >
                          <span className="truncate">{g.name}</span>
                          {g.id === group.id ? (
                            <span className="text-[10px] bg-[#F9A826] text-[#0B4A3F] px-2 py-0.5 rounded-full font-extrabold shrink-0">
                              Active
                            </span>
                          ) : g.isHeld ? (
                            <span className="text-[10px] bg-amber-500/80 text-black px-2 py-0.5 rounded-full font-extrabold shrink-0">
                              Held
                            </span>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => setShowGroupDropdown(false)}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-xs font-bold flex items-center justify-between text-white"
                      >
                        <span>{group.name}</span>
                        <span className="text-[10px] bg-[#F9A826] text-[#0B4A3F] px-2 py-0.5 rounded-full font-extrabold">
                          Active
                        </span>
                      </button>
                    )}
                    <div className="border-t border-white/10 my-1"></div>
                    <button
                      onClick={() => {
                        setShowGroupDropdown(false);
                        onOpenAddGroup();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-amber-400/20 text-xs font-bold text-[#F9A826] flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add New Room / Group</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-950/60 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-400/30 text-white shadow-xs">
                <span className="text-emerald-300 font-medium">Assigned Group:</span>
                <span className="text-amber-300 font-extrabold">{group.name}</span>
              </div>
            )}

            {/* Billing Cycle Toggle: Previous / Current */}
            <div className="flex items-center bg-black/25 p-1 rounded-2xl border border-white/20 backdrop-blur-xl self-start sm:self-auto">
              <button
                onClick={() => onToggleCycle('current')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  billingCycleType === 'current'
                    ? 'bg-[#F9A826] text-[#0B4A3F] shadow-lg shadow-amber-500/20'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                Current Cycle ({group.billingCycle.split('-')[0].trim()})
              </button>
              <button
                onClick={() => onToggleCycle('previous')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  billingCycleType === 'previous'
                    ? 'bg-[#F9A826] text-[#0B4A3F] shadow-lg shadow-amber-500/20'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                Previous Cycle (Jun 2026)
              </button>
            </div>
          </div>
        </div>
      </GlassContainer>
    </header>
  );
};

