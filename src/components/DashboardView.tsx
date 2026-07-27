import React from 'react';
import { Group, Expense, UtilityBill, RentContribution, GoogleSheetsConfig, UserAuthProfile } from '../types';
import { GlassContainer } from './GlassContainer';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Zap,
  Users,
  Utensils,
  ShoppingBag,
  Home as HomeIcon,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  PieChart,
} from 'lucide-react';

interface DashboardViewProps {
  group: Group;
  expenses: Expense[];
  utilities: UtilityBill[];
  rent: RentContribution;
  sheetsConfig: GoogleSheetsConfig;
  onSyncNow: () => void;
  isSyncing: boolean;
  preferredCurrency?: string;
  customRates?: Record<string, number>;
  currentUser?: UserAuthProfile | null;
  onNavigateTab: (tab: 'home' | 'expenses' | 'utilities' | 'report' | 'group') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  group,
  expenses,
  utilities,
  rent,
  sheetsConfig,
  onSyncNow,
  isSyncing,
  preferredCurrency = 'USD',
  customRates,
  currentUser,
  onNavigateTab,
}) => {
  // Financial Calculations
  const messTotal = expenses
    .filter((e) => e.type === 'mess')
    .reduce((sum, e) => sum + e.amount, 0);

  const generalTotal = expenses
    .filter((e) => e.type === 'general')
    .reduce((sum, e) => sum + e.amount, 0);

  const utilitiesTotal = utilities.reduce((sum, u) => sum + u.amount, 0);
  const rentTotal = rent?.totalRent || 0;

  const totalGroupExpenses = messTotal + generalTotal + utilitiesTotal + rentTotal;
  const activeMembers = group.members.filter((m) => m.active);
  const activeMembersCount = activeMembers.length || 1;
  const avgPerPerson = totalGroupExpenses / activeMembersCount;

  // Meal Rate calculation
  const totalMessDays = group.members.reduce((sum, m) => sum + (m.daysPresent || 0), 0) || 1;
  const dailyMealRate = messTotal / totalMessDays;

  return (
    <div className="space-y-6 pb-28">
      {/* Hero Group Overview Header Card */}
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border border-white/30 shadow-2xl relative overflow-hidden"
      >
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-200 bg-white/15 px-3.5 py-1 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5 text-[#F9A826]" />
              Master Room Dashboard Overview
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-100 flex items-center gap-1 font-semibold bg-black/30 px-3 py-1 rounded-full border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-[#F9A826]" />
                Cycle: {group.billingCycle}
              </span>
              <span className="text-xs text-emerald-200 font-semibold bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-400/40 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {group.members.length} Members
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">
              Total Room Budget & Expenses ({group.name})
            </span>
            <div className="mt-1">
              <DualCurrencyDisplay
                amount={totalGroupExpenses}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="hero"
                baseClassName="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 text-xs">
            <div className="flex items-center gap-4 text-emerald-100 font-semibold">
              <div>
                <span className="text-emerald-200/80 block text-[10px] uppercase font-bold">Avg Per Member</span>
                <span className="text-white font-extrabold">{avgPerPerson.toFixed(2)} {group.currency}</span>
              </div>
              <div className="h-6 w-[1px] bg-white/20" />
              <div>
                <span className="text-emerald-200/80 block text-[10px] uppercase font-bold">Daily Meal Rate</span>
                <span className="text-amber-300 font-extrabold">~{dailyMealRate.toFixed(2)} {group.currency}/day</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('report')}
              className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-4 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 border border-white/30 transition-all cursor-pointer"
            >
              <PieChart className="w-4 h-4" />
              <span>View Detailed Breakdown</span>
            </button>
          </div>
        </div>
      </GlassContainer>

      {/* QUICK NAVIGATION & CATEGORY ACTIONS (Placed directly after 1st Box) */}
      <div>
        <h3 className="text-xs font-black text-emerald-200 uppercase tracking-wider mb-2.5 px-1 drop-shadow-xs flex items-center justify-between">
          <span>Quick Navigation & Category Actions</span>
          <span className="text-[10px] text-amber-300 font-bold">1-Click Direct Access</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            onClick={() => onNavigateTab('report')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-3xl shadow-xl backdrop-blur-2xl transition-all group text-center active:scale-95 cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border border-emerald-400/30">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Expenses</span>
            <span className="text-[10px] text-emerald-200/80 font-medium">{expenses.length} Added</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-3xl shadow-xl backdrop-blur-2xl transition-all group text-center active:scale-95 cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border border-amber-400/30">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Utilities</span>
            <span className="text-[10px] text-amber-200/80 font-medium">DEWA, WiFi</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-3xl shadow-xl backdrop-blur-2xl transition-all group text-center active:scale-95 cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border border-blue-400/30">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Rent</span>
            <span className="text-[10px] text-blue-200/80 font-medium">{rent.totalRent} AED</span>
          </button>

          <button
            onClick={() => onNavigateTab('report')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-3xl shadow-xl backdrop-blur-2xl transition-all group text-center active:scale-95 cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border border-purple-400/30">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Settlement</span>
            <span className="text-[10px] text-purple-200/80 font-medium">Report</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Category KPI Glass Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Mess Expense Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-amber-400/30 text-white shadow-xl cursor-pointer hover:border-amber-400/60 transition-all"
          onClick={() => onNavigateTab('expenses')}
        >
          <div className="flex items-center justify-between text-amber-300 mb-2">
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
              Mess
            </span>
          </div>
          <span className="text-xs text-amber-200 font-semibold block">Mess Food Expenses</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={messTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-extrabold text-white"
            />
          </div>
          <span className="text-[10px] text-amber-200/80 mt-2 block">
            {expenses.filter((e) => e.type === 'mess').length} Transactions
          </span>
        </GlassContainer>

        {/* General Expenses Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-emerald-400/30 text-white shadow-xl cursor-pointer hover:border-emerald-400/60 transition-all"
          onClick={() => onNavigateTab('expenses')}
        >
          <div className="flex items-center justify-between text-emerald-300 mb-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase bg-emerald-400/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
              General
            </span>
          </div>
          <span className="text-xs text-emerald-200 font-semibold block">General Room Items</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={generalTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-extrabold text-white"
            />
          </div>
          <span className="text-[10px] text-emerald-200/80 mt-2 block">
            {expenses.filter((e) => e.type === 'general').length} Items
          </span>
        </GlassContainer>

        {/* Utilities Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-blue-400/30 text-white shadow-xl cursor-pointer hover:border-blue-400/60 transition-all"
          onClick={() => onNavigateTab('utilities')}
        >
          <div className="flex items-center justify-between text-blue-300 mb-2">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase bg-blue-400/20 px-2 py-0.5 rounded-full border border-blue-400/30">
              Utilities
            </span>
          </div>
          <span className="text-xs text-blue-200 font-semibold block">DEWA & WiFi Bills</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={utilitiesTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-extrabold text-white"
            />
          </div>
          <span className="text-[10px] text-blue-200/80 mt-2 block">
            {utilities.length} Utility Bills
          </span>
        </GlassContainer>

        {/* Landlord Rent Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-purple-400/30 text-white shadow-xl cursor-pointer hover:border-purple-400/60 transition-all"
          onClick={() => onNavigateTab('utilities')}
        >
          <div className="flex items-center justify-between text-purple-300 mb-2">
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase bg-purple-400/20 px-2 py-0.5 rounded-full border border-purple-400/30">
              Rent
            </span>
          </div>
          <span className="text-xs text-purple-200 font-semibold block">Landlord Room Rent</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={rentTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-extrabold text-white"
            />
          </div>
          <span className="text-[10px] text-purple-200/80 mt-2 block">
            Status: {rent?.status === 'paid' ? 'Paid' : 'Pending'}
          </span>
        </GlassContainer>
      </div>

      {/* Central Google Sheets Integration & Admin Panel Info (Admin Only) */}
      {currentUser?.role === 'admin' && (
        <GlassContainer variant="card" className="p-5 md:p-6 border border-white/30 text-white shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Google Sheets Central Synchronization</h3>
                <p className="text-xs text-emerald-100/80 font-medium">
                  Spreadsheet ID: <code className="text-amber-300 font-mono">{group.spreadsheetId ? group.spreadsheetId.substring(0, 16) + '...' : '1-VBgqW...'}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-emerald-950/70 border border-emerald-400/40 text-emerald-200 font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Auto-Syncing...' : 'Auto-Synced'}</span>
              </div>

              <a
                href={`https://docs.google.com/spreadsheets/d/${group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}/edit`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-400/50 transition-all cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#F9A826]" />
                <span>Open Sheet</span>
              </a>
            </div>
          </div>
        </GlassContainer>
      )}

      {/* Member List Quick Table */}
      <GlassContainer variant="card" className="p-5 md:p-6 border border-white/30 text-white shadow-2xl space-y-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#F9A826]" />
              Active Room Members ({group.members.length})
            </span>
            <button
              onClick={() => onNavigateTab('group')}
              className="text-xs text-amber-300 hover:underline font-bold"
            >
              Manage Members →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {group.members.map((member) => {
              const memberSpent = expenses
                .filter((e) => e.paidById === member.id)
                .reduce((sum, e) => sum + e.amount, 0);

              return (
                <div
                  key={member.id}
                  className="bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-md flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-emerald-950 font-black text-xs flex items-center justify-center shrink-0">
                      {member.avatar}
                    </div>
                    <span className="text-xs font-bold text-white truncate">{member.name}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-200 font-medium">{member.daysPresent} Days</span>
                    <span className="text-amber-300 font-extrabold">{memberSpent.toFixed(0)} {group.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>
      </GlassContainer>
    </div>
  );
};
