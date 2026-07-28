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

  // Exclude room rent from total dashboard group expenses as room rent is strictly managed in the Landlord Monthly Rent box
  const totalGroupExpenses = messTotal + generalTotal + utilitiesTotal;
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
        variant="card"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border-2 border-black shadow-xl bg-white text-slate-900 relative overflow-hidden"
      >
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-white bg-black px-3.5 py-1 rounded-full shadow-xs border border-black flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5 text-white" />
              Master Room Dashboard Overview
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-900 flex items-center gap-1 font-bold bg-white px-3 py-1 rounded-full border border-black">
                <Calendar className="w-3.5 h-3.5 text-slate-900" />
                Cycle: {group.billingCycle}
              </span>
              <span className="text-xs text-slate-900 font-bold bg-white px-3 py-1 rounded-full border border-black flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                {group.members.length} Members
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              TOTAL EXPENSES
            </span>
            <div className="mt-1">
              <DualCurrencyDisplay
                amount={totalGroupExpenses}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="hero"
                baseClassName="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950 drop-shadow-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-black/20 text-xs">
            <div className="flex items-center gap-4 text-slate-900 font-semibold">
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Avg Per Member</span>
                <span className="text-slate-950 font-extrabold">{avgPerPerson.toFixed(2)} {group.currency}</span>
              </div>
              <div className="h-6 w-[1px] bg-black/20" />
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Daily Meal Rate</span>
                <span className="text-slate-950 font-extrabold">~{dailyMealRate.toFixed(2)} {group.currency}/day</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('report')}
              className="bg-black hover:bg-slate-800 text-white font-black px-4 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md border border-black transition-all cursor-pointer"
            >
              <PieChart className="w-4 h-4 text-white" />
              <span>View Detailed Breakdown</span>
            </button>
          </div>
        </div>
      </GlassContainer>

      {/* QUICK NAVIGATION & CATEGORY ACTIONS */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 px-1 flex items-center justify-between">
          <span>Quick Navigation & Category Actions</span>
          <span className="text-[10px] text-slate-700 font-bold">1-Click Direct Access</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            onClick={() => onNavigateTab('report')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white hover:bg-slate-100 border border-black rounded-3xl shadow-md transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border border-black">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Expenses</span>
            <span className="text-[10px] text-slate-600 font-medium">{expenses.length} Added</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white hover:bg-slate-100 border border-black rounded-3xl shadow-md transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border border-black">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Utilities</span>
            <span className="text-[10px] text-slate-600 font-medium">DEWA, WiFi</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white hover:bg-slate-100 border border-black rounded-3xl shadow-md transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border border-black">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Rent</span>
            <span className="text-[10px] text-slate-600 font-medium">{rent.totalRent} AED</span>
          </button>

          <button
            onClick={() => onNavigateTab('report')}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white hover:bg-slate-100 border border-black rounded-3xl shadow-md transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform border border-black">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Settlement</span>
            <span className="text-[10px] text-slate-600 font-medium">Report</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Category KPI Glass Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Mess Expense Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-black text-slate-900 bg-white shadow-md cursor-pointer hover:border-black transition-all"
          onClick={() => onNavigateTab('expenses')}
        >
          <div className="flex items-center justify-between text-slate-900 mb-2">
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase bg-black text-white px-2 py-0.5 rounded-full border border-black">
              Mess
            </span>
          </div>
          <span className="text-xs text-slate-700 font-semibold block">Mess Food Expenses</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={messTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-extrabold text-slate-950"
            />
          </div>
          <span className="text-[10px] text-slate-600 mt-2 block">
            {expenses.filter((e) => e.type === 'mess').length} Transactions
          </span>
        </GlassContainer>

        {/* General Expenses Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-black text-slate-900 bg-white shadow-md cursor-pointer hover:border-black transition-all"
          onClick={() => onNavigateTab('expenses')}
        >
          <div className="flex items-center justify-between text-slate-900 mb-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase bg-black text-white px-2 py-0.5 rounded-full border border-black">
              General
            </span>
          </div>
          <span className="text-xs text-slate-700 font-semibold block">General Room Items</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={generalTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-extrabold text-slate-950"
            />
          </div>
          <span className="text-[10px] text-slate-600 mt-2 block">
            {expenses.filter((e) => e.type === 'general').length} Items
          </span>
        </GlassContainer>

        {/* Utilities Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-black text-slate-900 bg-white shadow-md cursor-pointer hover:border-black transition-all"
          onClick={() => onNavigateTab('utilities')}
        >
          <div className="flex items-center justify-between text-slate-900 mb-2">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase bg-black text-white px-2 py-0.5 rounded-full border border-black">
              Utilities
            </span>
          </div>
          <span className="text-xs text-slate-700 font-semibold block">DEWA & WiFi Bills</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={utilitiesTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-extrabold text-slate-950"
            />
          </div>
          <span className="text-[10px] text-slate-600 mt-2 block">
            {utilities.length} Utility Bills
          </span>
        </GlassContainer>

        {/* Landlord Rent Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-black text-slate-900 bg-white shadow-md cursor-pointer hover:border-black transition-all"
          onClick={() => onNavigateTab('utilities')}
        >
          <div className="flex items-center justify-between text-slate-900 mb-2">
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase bg-black text-white px-2 py-0.5 rounded-full border border-black">
              Rent
            </span>
          </div>
          <span className="text-xs text-slate-700 font-bold block">Landlord Monthly Rent</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={rentTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-extrabold text-slate-950"
            />
          </div>
          <span className="text-[10px] text-slate-600 mt-2 block">
            Status: {rent?.status === 'paid' ? 'Paid' : 'Pending'}
          </span>
        </GlassContainer>
      </div>

      {/* Central Google Sheets Integration & Admin Panel Info (Admin Only) */}
      {currentUser?.role === 'admin' && (
        <GlassContainer variant="card" className="p-5 md:p-6 border border-black text-slate-900 bg-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-black flex items-center justify-center text-slate-900">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Google Sheets Central Synchronization</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Spreadsheet ID: <code className="text-slate-900 font-mono font-bold">{group.spreadsheetId ? group.spreadsheetId.substring(0, 16) + '...' : '1-VBgqW...'}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-white border border-black text-slate-900 font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs">
                <RefreshCw className={`w-3.5 h-3.5 text-slate-900 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Auto-Syncing...' : 'Auto-Synced'}</span>
              </div>

              <a
                href={`https://docs.google.com/spreadsheets/d/${group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}/edit`}
                target="_blank"
                rel="noreferrer"
                className="bg-black hover:bg-slate-800 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-black transition-all cursor-pointer shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5 text-white" />
                <span>Open Sheet</span>
              </a>
            </div>
          </div>
        </GlassContainer>
      )}

      {/* Member List Quick Table */}
      <GlassContainer variant="card" className="p-5 md:p-6 border border-black text-slate-900 bg-white shadow-lg space-y-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-900" />
              Active Room Members ({group.members.length})
            </span>
            <button
              onClick={() => onNavigateTab('group')}
              className="text-xs text-slate-900 hover:underline font-extrabold cursor-pointer"
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
                  className="bg-white border border-black p-3 rounded-2xl flex items-center gap-2.5 text-slate-900"
                >
                  <div className="w-8 h-8 rounded-xl bg-black text-white font-black text-xs flex items-center justify-center shrink-0 border border-black">
                    {member.avatar}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate block">{member.name}</span>
                    <span className="text-[10px] text-slate-600 font-medium block">{member.daysPresent} Days</span>
                  </div>
                </div>
              );
            })}
          </div>
      </GlassContainer>
    </div>
  );
};
