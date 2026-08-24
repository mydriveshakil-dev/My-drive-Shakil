import React, { useState } from 'react';
import { Group, GoogleSheetsConfig, UserAuthProfile, Expense, UtilityBill } from '../types';
import { RefreshCw, Code, Coins, ShieldCheck, LogOut, ExternalLink, ChevronDown, Building2, X, Users, CheckCircle2 } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import uaeMessLogo from '../assets/images/uae_mess_logo_1785022712689.jpg';
import { getLoggedInMember } from '../utils/permissionUtils';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface HeaderBarProps {
  group: Group;
  allGroups?: Group[];
  onSelectGroup?: (group: Group) => void;
  expenses?: Expense[];
  utilities?: UtilityBill[];
  totalExpenses?: number;
  sheetsConfig: GoogleSheetsConfig;
  onSyncNow: () => void;
  onOpenAddGroup?: () => void;
  onOpenArchGuide?: () => void;
  isSyncing: boolean;
  preferredCurrency: string;
  onOpenCurrencySettings: () => void;
  currentUser?: UserAuthProfile | null;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenInstallPwa?: () => void;
  customRates?: Record<string, number>;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  group,
  allGroups = [],
  onSelectGroup,
  expenses = [],
  utilities = [],
  totalExpenses,
  sheetsConfig,
  onSyncNow,
  onOpenArchGuide,
  isSyncing,
  preferredCurrency,
  onOpenCurrencySettings,
  currentUser,
  onOpenLoginModal,
  onLogout,
  onOpenProfile,
  customRates,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [isGroupSwitcherOpen, setIsGroupSwitcherOpen] = useState(false);

  // Calculate total group expenses (mess + general + utilities)
  const messTotal = expenses
    .filter((e) => e.type === 'mess')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const generalTotal = expenses
    .filter((e) => e.type === 'general')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const utilitiesTotal = utilities.reduce((sum, u) => sum + (u.amount || 0), 0);
  const calculatedTotal = totalExpenses !== undefined ? totalExpenses : messTotal + generalTotal + utilitiesTotal;

  const sheetUrl = group?.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${group.spreadsheetId}/edit`
    : group?.id === 'group-room-3'
    ? 'https://docs.google.com/spreadsheets/d/1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM/edit'
    : null;

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

  const handleGroupClick = () => {
    if (isAdmin && onSelectGroup) {
      triggerHaptic(hapticPatterns.click);
      setIsGroupSwitcherOpen(true);
    }
  };

  return (
    <header className="mb-4 z-30 relative w-full">
      {/* Curved Deep Navy Header Card matching requested banner shape */}
      <div className="bg-gradient-to-b from-[#07193F] via-[#06163A] to-[#041029] text-white rounded-[32px] sm:rounded-[40px] pt-3.5 pb-4 px-4 sm:pt-4 sm:pb-5 sm:px-6 shadow-2xl border border-blue-900/40 relative overflow-hidden flex flex-col justify-between min-h-[310px] sm:min-h-[320px]">
        {/* Bottom-Left: Logout Button on top, "Logout" text below, aligned with Group Name row */}
        {onLogout && (
          <div className="absolute bottom-3.5 left-3.5 sm:bottom-4 sm:left-5 z-20 flex flex-col items-center gap-1">
            <button
              onClick={onLogout}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#0A204C]/95 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center transition-all border border-blue-400/40 cursor-pointer shadow-md shrink-0"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </button>
            <span className="text-center text-xs sm:text-sm font-bold text-white max-w-[80px] sm:max-w-[90px] truncate leading-tight">
              Logout
            </span>
          </div>
        )}

        {/* Bottom-Right: Profile Image on top, User Name below, aligned with Group Name row */}
        <div className="absolute bottom-3.5 right-3.5 sm:bottom-4 sm:right-5 z-20 flex flex-col items-center gap-1">
          {/* Profile Image button */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-transparent border-0 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 active:scale-95 transition-all shadow-md"
            title="View and edit profile picture"
          >
            <MemberAvatar
              name={userName}
              avatar={userAvatar}
              size="custom"
              shape="square"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover"
              textClassName="text-xs font-black"
            />
          </button>

          {/* User Name */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="text-center text-xs sm:text-sm font-bold text-white max-w-[80px] sm:max-w-[110px] truncate leading-tight hover:underline cursor-pointer bg-transparent border-0 p-0"
            title="View and edit profile picture"
          >
            {userName}
          </button>
        </div>

        {/* Center Container with 3 Vertically Spaced Sections */}
        <div className="w-full flex-1 flex flex-col justify-between items-center text-center pt-0 z-10 px-16 sm:px-24">
          {/* Section 1: Logo Top Center + "UAE MESS" text directly below, positioned right at top */}
          <div className="flex flex-col items-center justify-center pt-0">
            <div className="p-0.5 bg-white rounded-2xl shadow-md border-2 border-white/80 shrink-0">
              <img
                src={uaeMessLogo}
                alt="UAE MESS Logo"
                className="w-[65px] h-[65px] rounded-xl object-cover"
              />
            </div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase mt-1">
              UAE MESS
            </h1>
          </div>

          {/* Section 2: TOTAL EXPENSES + Amount centered in middle */}
          <div className="flex flex-col items-center justify-center space-y-1 my-auto py-2">
            <span className="text-xs sm:text-sm font-black text-white/90 uppercase tracking-widest block">
              TOTAL EXPENSES
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <DualCurrencyDisplay
                amount={calculatedTotal}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="hero"
                baseClassName="text-[34px] sm:text-[38px] font-black tracking-tight text-white font-[system-ui] leading-none"
              />
            </div>
          </div>

          {/* Section 3: Group Name with inline collapsible group switcher */}
          <div className="w-full text-center pb-0.5 mt-auto relative">
            <span className="text-[10px] sm:text-[11px] font-black text-white/90 uppercase tracking-widest block mb-0.5">
              GROUP NAME
            </span>
            {isAdmin && onSelectGroup && allGroups.length > 0 ? (
              <div className="relative inline-block max-w-full">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(hapticPatterns.click);
                    setIsGroupSwitcherOpen((prev) => !prev);
                  }}
                  className={`group/grp inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-2xl transition-all cursor-pointer shadow-xs max-w-full ${
                    isGroupSwitcherOpen
                      ? 'bg-blue-600/40 border border-blue-300 text-white ring-2 ring-blue-400/40'
                      : 'bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20'
                  }`}
                  title="Click to switch group (Collapsible list)"
                >
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-white uppercase drop-shadow-sm inline-flex items-center justify-center gap-2 truncate">
                    <span>{group.name}</span>
                    {group.isHeld && (
                      <span className="inline-flex items-center bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs shrink-0">
                        ON HOLD
                      </span>
                    )}
                  </h2>
                  <ChevronDown
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-blue-300 group-hover/grp:text-white transition-transform duration-200 shrink-0 stroke-[2.5] ${
                      isGroupSwitcherOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {/* Inline Collapsible Groups Dropdown */}
                {isGroupSwitcherOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 sm:mb-2.5 w-[260px] sm:w-[300px] bg-[#07193F] text-white rounded-2xl border border-blue-400/50 shadow-2xl p-2 z-[60] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md max-h-[220px] overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/10">
                      <span className="text-[10px] font-black text-blue-200 uppercase tracking-wider flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-blue-400" />
                        Select Room ({allGroups.length})
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsGroupSwitcherOpen(false);
                        }}
                        className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {allGroups.map((grp) => {
                        const isCurrent = grp.id === group.id;
                        const memberCount = grp.members?.length || 0;

                        return (
                          <button
                            key={grp.id}
                            type="button"
                            onClick={() => {
                              onSelectGroup(grp);
                              setIsGroupSwitcherOpen(false);
                              triggerHaptic(hapticPatterns.success);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                              isCurrent
                                ? 'bg-blue-600/40 border-blue-400 text-white font-black shadow-xs'
                                : 'bg-white/5 hover:bg-white/15 border-transparent text-slate-200 font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-xs uppercase truncate">
                                {grp.name}
                              </span>
                              {grp.isHeld && (
                                <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded-full uppercase shrink-0">
                                  HOLD
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-blue-300/80 font-medium flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" />
                                {memberCount}
                              </span>
                              {isCurrent && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-white uppercase drop-shadow-sm inline-flex items-center justify-center gap-2">
                <span>{group.name}</span>
                {group.isHeld && (
                  <span className="inline-flex items-center bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs shrink-0">
                    ON HOLD
                  </span>
                )}
              </h2>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
