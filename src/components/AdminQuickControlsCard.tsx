import React from 'react';
import { Group, GoogleSheetsConfig, UserAuthProfile } from '../types';
import {
  Coins,
  RefreshCw,
  ExternalLink,
  Code,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface AdminQuickControlsCardProps {
  group: Group;
  allGroups?: Group[];
  sheetsConfig: GoogleSheetsConfig;
  onSyncNow: () => void;
  isSyncing: boolean;
  preferredCurrency?: string;
  onOpenCurrencySettings?: () => void;
  onOpenArchGuide?: () => void;
  onOpenLoginModal?: () => void;
  onNavigateTab?: (tab: 'home' | 'expenses' | 'utilities' | 'report' | 'group' | 'chat') => void;
  currentUser?: UserAuthProfile | null;
}

export const AdminQuickControlsCard: React.FC<AdminQuickControlsCardProps> = ({
  group,
  allGroups = [],
  sheetsConfig,
  onSyncNow,
  isSyncing,
  preferredCurrency = 'AED',
  onOpenCurrencySettings,
  onOpenArchGuide,
  onOpenLoginModal,
  onNavigateTab,
  currentUser,
}) => {
  const sheetUrl = group?.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${group.spreadsheetId}/edit`
    : group?.id === 'group-room-3'
    ? 'https://docs.google.com/spreadsheets/d/1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM/edit'
    : null;

  const handleSyncClick = () => {
    triggerHaptic(hapticPatterns.sync);
    onSyncNow();
  };

  const handleCurrencyClick = () => {
    triggerHaptic(hapticPatterns.click);
    if (onOpenCurrencySettings) onOpenCurrencySettings();
  };

  const handleGuideClick = () => {
    triggerHaptic(hapticPatterns.click);
    if (onOpenArchGuide) onOpenArchGuide();
  };

  const handleAdminPortalClick = () => {
    triggerHaptic(hapticPatterns.click);
    if (onOpenLoginModal) onOpenLoginModal();
  };

  const handleGroupsClick = () => {
    triggerHaptic(hapticPatterns.click);
    if (onNavigateTab) onNavigateTab('group');
  };

  return (
    <section
      id="admin-quick-controls-section"
      className="rounded-3xl neu-upper text-slate-900 overflow-hidden p-4 sm:p-5 space-y-4 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border border-blue-200/60 shadow-md"
    >
      {/* Header Bar of Admin Component */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#07193F] text-blue-400 flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
                Admin Control Center
              </h3>
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Quick tools, Google Sheets sync, currency, and architecture controls
            </p>
          </div>
        </div>
      </div>

      {/* Grid of 4 Action Cards aligned side-by-side in same horizontal alignment */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {/* 1. Currency Settings Card */}
        <button
          type="button"
          onClick={handleCurrencyClick}
          className="flex flex-col justify-between p-2 sm:p-3.5 rounded-2xl bg-white hover:bg-blue-50/60 active:scale-97 border border-slate-200/90 hover:border-blue-300 shadow-xs transition-all text-left cursor-pointer group min-h-[85px] sm:min-h-[96px]"
        >
          <div className="flex items-center justify-between w-full mb-1 sm:mb-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-600 hidden xs:inline">
              Change
            </span>
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block leading-tight mb-0.5 truncate">
              Currency
            </span>
            <span className="text-[11px] sm:text-sm font-black text-slate-900 truncate block">
              {preferredCurrency}
            </span>
          </div>
        </button>

        {/* 2. Google Sheets Sync Card */}
        <button
          type="button"
          onClick={handleSyncClick}
          disabled={isSyncing}
          className="flex flex-col justify-between p-2 sm:p-3.5 rounded-2xl bg-white hover:bg-blue-50/60 active:scale-97 border border-slate-200/90 hover:border-blue-300 shadow-xs transition-all text-left cursor-pointer group min-h-[85px] sm:min-h-[96px]"
        >
          <div className="flex items-center justify-between w-full mb-1 sm:mb-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </div>
            <span className={`text-[9px] sm:text-[10px] font-black uppercase hidden xs:inline ${isSyncing ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isSyncing ? 'Syncing' : 'Ready'}
            </span>
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block leading-tight mb-0.5 truncate">
              Cloud Sync
            </span>
            <span className="text-[11px] sm:text-sm font-black text-slate-900 truncate block">
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </span>
          </div>
        </button>

        {/* 3. Google Sheet Master Link Card */}
        {sheetUrl ? (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => triggerHaptic(hapticPatterns.click)}
            className="flex flex-col justify-between p-2 sm:p-3.5 rounded-2xl bg-white hover:bg-emerald-50/60 active:scale-97 border border-slate-200/90 hover:border-emerald-300 shadow-xs transition-all text-left cursor-pointer group min-h-[85px] sm:min-h-[96px]"
          >
            <div className="flex items-center justify-between w-full mb-1 sm:mb-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors hidden xs:inline" />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block leading-tight mb-0.5 truncate">
                Master Data
              </span>
              <span className="text-[11px] sm:text-sm font-black text-slate-900 truncate block">
                Sheet
              </span>
            </div>
          </a>
        ) : (
          <div className="flex flex-col justify-between p-2 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 shadow-xs text-left opacity-75 min-h-[85px] sm:min-h-[96px]">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center mb-1 sm:mb-2">
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block leading-tight mb-0.5 truncate">
                Master Data
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate block">Not Set</span>
            </div>
          </div>
        )}

        {/* 4. API Guide Card */}
        {onOpenArchGuide ? (
          <button
            type="button"
            onClick={handleGuideClick}
            className="flex flex-col justify-between p-2 sm:p-3.5 rounded-2xl bg-white hover:bg-purple-50/60 active:scale-97 border border-slate-200/90 hover:border-purple-300 shadow-xs transition-all text-left cursor-pointer group min-h-[85px] sm:min-h-[96px]"
          >
            <div className="flex items-center justify-between w-full mb-1 sm:mb-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Code className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-purple-600 hidden xs:inline">
                Docs
              </span>
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block leading-tight mb-0.5 truncate">
                Architecture
              </span>
              <span className="text-[11px] sm:text-sm font-black text-slate-900 truncate block">
                Guide
              </span>
            </div>
          </button>
        ) : (
          <div className="flex flex-col justify-between p-2 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 shadow-xs text-left opacity-75 min-h-[85px] sm:min-h-[96px]">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-1 sm:mb-2">
              <Code className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block leading-tight mb-0.5 truncate">
                Architecture
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate block">API Guide</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Info Strip */}
      <div className="bg-[#07193F] text-white rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 flex-wrap text-xs shadow-inner">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300 text-[11px] font-medium">
            Room: <strong className="text-white font-bold">{group.name}</strong> • Connected to Cloud & Firestore
          </span>
        </div>
      </div>
    </section>
  );
};
