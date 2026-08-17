import React, { useState } from 'react';
import { Group, GoogleSheetsConfig, BillingCycleType, UserAuthProfile, Expense } from '../types';
import { ChevronDown, RefreshCw, Layers, Plus, Code, CheckCircle2, Coins, ShieldCheck, LogOut, ExternalLink, Smartphone } from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { MemberAvatar } from './MemberAvatar';
import uaeMessLogo from '../assets/images/uae_mess_logo_1785022712689.jpg';
import { getPreviousCycleOptions } from '../utils/cycleUtils';
import { getLoggedInMember } from '../utils/permissionUtils';

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
  const previousCycleOptions = getPreviousCycleOptions(24);
  const isAdmin = currentUser?.role === 'admin';
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  const isCustomGroupWithoutCustomSheet = group?.id !== 'group-room-3' && (!group?.spreadsheetId || group.spreadsheetId === '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM');

  // Helper to calculate total expenses for a specific cycleId
  const getCycleTotalExpenses = (cId: string) => {
    return expenses
      .filter((e) => {
        const itemGroupId = e.groupId;
        if (itemGroupId && itemGroupId !== group.id) return false;
        if (!itemGroupId && group.id !== 'group-room-3') return false;

        if (isCustomGroupWithoutCustomSheet) {
          if (!e.id.startsWith('exp-')) {
            return false;
          }
        }
        const expCycle = e.cycle || (e.date ? e.date.slice(0, 7) : '');
        return expCycle === cId;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const activeSelectedPreviousCycleId = selectedPreviousCycle || previousCycleOptions[0]?.cycleId || '2026-07';
  const activePreviousCycleTotal = getCycleTotalExpenses(activeSelectedPreviousCycleId);
  const sheetUrl = group?.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${group.spreadsheetId}/edit`
    : group?.id === 'group-room-3'
    ? 'https://docs.google.com/spreadsheets/d/1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM/edit'
    : null;

  return (
    <header className="mb-4 z-30 relative w-full">
      {/* Combined Single Header Card */}
      <div className="bg-gradient-to-b from-[#07193F] to-[#041029] text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-800/80 relative overflow-hidden space-y-4">
        {/* Absolute Top-Right Stack: Logout on top, Ass. Group directly below */}
        <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-20 flex flex-col items-end gap-1.5 sm:gap-2">
          {/* Top Row: Admin Portal (if admin) + Logout Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAdmin && onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="inline-flex items-center gap-1.5 bg-[#0B2A66]/90 hover:bg-[#0E347E] text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-2xl border border-blue-400/30 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                title="Member & Admin Account Portal"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                <span className="hidden xs:inline sm:inline">{currentUser?.isLoggedIn ? 'Admin Portal' : 'Login'}</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#0A204C]/90 hover:bg-rose-600/90 active:scale-95 text-white flex items-center justify-center transition-all border border-blue-400/30 cursor-pointer shadow-md shrink-0"
                title="Logout Session"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </button>
            )}
          </div>

          {/* Bottom Row: Ass. Group directly below the Logout button */}
          <div className="flex items-center gap-1.5 bg-[#0B2556]/90 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-blue-400/30 text-[11px] sm:text-xs shadow-sm">
            <span className="text-blue-200/80 font-medium whitespace-nowrap">Ass. Group:</span>
            {isAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                  className="flex items-center gap-1 font-bold text-white hover:text-blue-200 transition-all cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span className="max-w-[85px] sm:max-w-[140px] truncate">{group.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-blue-300 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showGroupDropdown && (
                  <div className="absolute right-0 mt-2 w-60 sm:w-64 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2">
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
              <span className="text-white font-bold text-[11px] sm:text-xs max-w-[90px] sm:max-w-[140px] truncate">{group.name}</span>
            )}
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          {/* Header Row: Logo & Info on Left (padded on right for absolute top-right controls) */}
          <div className="pr-36 xs:pr-44 sm:pr-56">
            {/* Left: Logo & Title & User Badge */}
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
                  <span className="truncate max-w-[130px] xs:max-w-[180px] sm:max-w-[280px] md:max-w-none">{group.name}</span>
                  {group.isHeld && (
                    <span className="inline-flex items-center bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs shrink-0">
                      ON HOLD
                    </span>
                  )}
                </h1>
                {(() => {
                  const loggedInMember = getLoggedInMember(group, currentUser);
                  const userName =
                    currentUser?.name ||
                    currentUser?.identity?.fullName ||
                    loggedInMember?.name ||
                    'Member';
                  const userAvatar =
                    currentUser?.avatar ||
                    currentUser?.identity?.photoUrl ||
                    loggedInMember?.avatar ||
                    '';
                  return (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 bg-[#0B2A66]/90 border border-blue-400/30 text-blue-200 font-bold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-xs">
                        <MemberAvatar
                          name={userName}
                          avatar={userAvatar}
                          size="xs"
                          className="w-4.5 h-4.5 text-[8px] shrink-0 border border-white/20 shadow-xs"
                        />
                        <span className="truncate max-w-[110px] sm:max-w-[160px]">{userName}</span>
                      </span>
                    </div>
                  );
                })()}
              </div>
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

              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-medium px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
                  <span>Google Sheet</span>
                </a>
              )}

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

