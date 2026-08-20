import React from 'react';
import { Group, GoogleSheetsConfig, UserAuthProfile, Expense, UtilityBill } from '../types';
import { RefreshCw, Code, Coins, ShieldCheck, LogOut, ExternalLink } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import uaeMessLogo from '../assets/images/uae_mess_logo_1785022712689.jpg';
import { getLoggedInMember } from '../utils/permissionUtils';

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
  onOpenInstallPwa?: () => void;
  customRates?: Record<string, number>;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  group,
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
  customRates,
}) => {
  const isAdmin = currentUser?.role === 'admin';

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
          {/* Profile Image */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-transparent border-0 flex items-center justify-center shrink-0 overflow-hidden">
            <MemberAvatar
              name={userName}
              avatar={userAvatar}
              size="custom"
              shape="square"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover"
              textClassName="text-xs font-black"
            />
          </div>

          {/* User Name */}
          <span className="text-center text-xs sm:text-sm font-bold text-white max-w-[80px] sm:max-w-[110px] truncate leading-tight">
            {userName}
          </span>

          {isAdmin && onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="inline-flex items-center gap-1 bg-[#0B2A66]/90 hover:bg-[#0E347E] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg border border-blue-400/30 transition-all cursor-pointer shadow-xs whitespace-nowrap mt-0.5"
              title="Admin Account Portal"
            >
              <ShieldCheck className="w-3 h-3 text-blue-300" />
              <span>Admin</span>
            </button>
          )}
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

          {/* Section 3: Group Name "ROOM NO 3" with equal spacing, aligned horizontally with Logout & Profile buttons */}
          <div className="w-full text-center pb-0.5 mt-auto">
            <span className="text-[10px] sm:text-[11px] font-black text-white/90 uppercase tracking-widest block mb-0.5">
              GROUP NAME
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-white uppercase drop-shadow-sm inline-flex items-center justify-center gap-2">
              <span>{group.name}</span>
              {group.isHeld && (
                <span className="inline-flex items-center bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs shrink-0">
                  ON HOLD
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Admin Tools Row (if admin) */}
        {isAdmin && (
          <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-2 flex-wrap text-xs z-10 mt-2">
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

            {onOpenArchGuide && (
              <button
                onClick={onOpenArchGuide}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-medium px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-blue-300" />
                <span>API Guide</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
