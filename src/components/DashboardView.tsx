import React, { useState } from 'react';
import { Group, Expense, UtilityBill, RentContribution, GoogleSheetsConfig, UserAuthProfile } from '../types';
import { GlassContainer } from './GlassContainer';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { cleanExpenseTitle } from '../utils/textCleaner';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
  Receipt,
  Trash2,
  Info,
  User,
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
  onDeleteExpense?: (id: string) => void;
}

const CHART_COLORS = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#EC4899', '#06B6D4', '#F97316', '#14B8A6'];

const ITEM_THEMES = [
  {
    cardBg: 'bg-[#F0F6FF]/80 border-blue-100/90',
    avatarBg: 'bg-[#2563EB]',
    barFill: 'bg-[#2563EB]',
    barTrack: 'bg-blue-100/80',
    pillBg: 'bg-[#EFF6FF] text-[#2563EB] font-bold border border-blue-100/60',
  },
  {
    cardBg: 'bg-[#F0FDF4]/80 border-emerald-100/90',
    avatarBg: 'bg-[#059669]',
    barFill: 'bg-[#059669]',
    barTrack: 'bg-emerald-100/80',
    pillBg: 'bg-[#ECFDF5] text-[#059669] font-bold border border-emerald-100/60',
  },
  {
    cardBg: 'bg-[#FFFBEB]/80 border-amber-100/90',
    avatarBg: 'bg-[#D97706]',
    barFill: 'bg-[#D97706]',
    barTrack: 'bg-amber-100/80',
    pillBg: 'bg-[#FFFBEB] text-[#D97706] font-bold border border-amber-100/60',
  },
  {
    cardBg: 'bg-[#F3E8FF]/60 border-purple-100/90',
    avatarBg: 'bg-[#7C3AED]',
    barFill: 'bg-[#7C3AED]',
    barTrack: 'bg-purple-100/80',
    pillBg: 'bg-[#F3E8FF] text-[#7C3AED] font-bold border border-purple-100/60',
  },
];

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
  onDeleteExpense,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
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

  // Mess calculation
  const messPerMember = messTotal / activeMembersCount;

  // Top Contributors Pie Chart Data (Sorted descending by highest expense amount)
  const contributorData = group.members
    .map((member) => {
      const totalPaid = expenses
        .filter((e) => e.paidById === member.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        name: member.name,
        value: Math.round(totalPaid * 100) / 100,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // My Contribution calculation
  const myMember = (group?.members || []).find(
    (m) =>
      (currentUser?.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase())) ||
      m.name.includes('Shakil') ||
      m.id === 'm3'
  ) || group?.members?.[0];

  const mySpent = expenses
    .filter((e) => e.paidById === myMember?.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const myPercentage = totalGroupExpenses > 0 ? (mySpent / totalGroupExpenses) * 100 : 0;

  return (
    <div className="space-y-6 pb-28">
      {/* Master Room Dashboard Overview Card */}
      <div className="rounded-3xl border border-slate-200/80 shadow-md bg-white text-slate-900 overflow-hidden">
        {/* Top Dark Navy Header Band */}
        <div className="bg-[#07193F] text-white px-5 py-3.5 flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
          <LayoutDashboard className="w-4 h-4 text-white" />
          <span>MASTER ROOM DASHBOARD OVERVIEW</span>
        </div>

        {/* Card Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Cycle & Members Pill Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs text-slate-700 font-semibold flex items-center gap-2 justify-center shadow-2xs">
              <Calendar className="w-4 h-4 text-[#07193F]" />
              <span>Cycle: {group.billingCycle}</span>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 text-xs text-slate-700 font-semibold flex items-center gap-2 justify-center shadow-2xs">
              <Users className="w-4 h-4 text-[#07193F]" />
              <span>{group.members.length} Members</span>
            </div>
          </div>

          {/* Total Expenses Section */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div>
              <span className="text-[11px] font-extrabold text-[#1E3A8A] uppercase tracking-wider block">
                TOTAL EXPENSES
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <DualCurrencyDisplay
                  amount={totalGroupExpenses}
                  baseCurrency={group.currency}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  layout="hero"
                  baseClassName="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#07193F]"
                />
              </div>
            </div>

            {/* View Details Right Card */}
            <button
              onClick={() => onNavigateTab('expenses')}
              className="bg-[#EFF6FF] hover:bg-blue-100/70 border border-blue-100 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer min-w-[100px] transition-all shadow-2xs active:scale-95"
            >
              <Receipt className="w-6 h-6 text-[#0052FF]" />
              <span className="text-xs font-bold text-[#0052FF] mt-1">View Details</span>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-2" />

          {/* Avg per member & Mess per member */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 text-xs">
            <div className="pr-3">
              <span className="text-[10px] font-extrabold text-[#1E3A8A] uppercase block">
                AVG PER MEMBER
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#07193F] mt-0.5 block">
                {avgPerPerson.toFixed(2)} {group.currency}
              </span>
            </div>
            <div className="pl-4">
              <span className="text-[10px] font-extrabold text-[#1E3A8A] uppercase block">
                MESS PER MEMBER
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#07193F] mt-0.5 block">
                {messPerMember.toFixed(2)} {group.currency}
              </span>
            </div>
          </div>

          {/* View Detailed Breakdown Button */}
          <button
            onClick={() => onNavigateTab('report')}
            className="w-full bg-[#07193F] hover:bg-[#0B2556] active:scale-98 text-white font-bold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <PieChart className="w-4 h-4 text-white" />
            <span>View Detailed Breakdown</span>
          </button>
        </div>
      </div>

      {/* TOP CONTRIBUTORS (PAID OUT OF POCKET) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-[#0052FF]">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#07193F] leading-snug">
                Top Contributors
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                (Paid Out of Pocket)
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] text-[#0052FF] text-xs font-extrabold px-3 py-1.5 rounded-full border border-blue-100/80 shadow-2xs">
            <Calendar className="w-3.5 h-3.5" />
            <span>CURRENT CYCLE</span>
          </div>
        </div>

        {contributorData.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-row items-center gap-3 sm:gap-6">
              {/* Donut Pie Chart on the Left */}
              {(() => {
                const totalContributions = contributorData.reduce((acc, curr) => acc + curr.value, 0);
                return (
                  <div className="relative w-[130px] h-[130px] sm:w-[170px] sm:h-[170px] shrink-0 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={contributorData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={62}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="#ffffff"
                          strokeWidth={2.5}
                        >
                          {contributorData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#1E3A8A] tracking-wider uppercase">TOTAL</span>
                      <span className="text-sm sm:text-lg font-black text-[#07193F] tracking-tight leading-none my-0.5">
                        {totalContributions.toFixed(2)}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-[#1E3A8A] tracking-wider uppercase">{group.currency}</span>
                    </div>
                  </div>
                );
              })()}

              {/* List of Contributor Cards on the Right */}
              <div className="flex-1 min-w-0 space-y-2">
                {(() => {
                  const totalContributions = contributorData.reduce((acc, curr) => acc + curr.value, 0);
                  return contributorData.map((item, idx) => {
                    const pct = totalContributions > 0 ? (item.value / totalContributions) * 100 : 0;
                    const theme = ITEM_THEMES[idx % ITEM_THEMES.length];
                    const initials = item.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={item.name}
                        className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between gap-2 ${theme.cardBg}`}
                      >
                        {/* Avatar + Name + Bar */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white font-extrabold text-[10px] sm:text-xs flex items-center justify-center shrink-0 shadow-xs ${theme.avatarBg}`}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#07193F] text-xs sm:text-sm truncate">
                              {item.name}
                            </h4>
                            <div className={`w-full max-w-[100px] sm:max-w-[160px] h-1.5 sm:h-2 rounded-full overflow-hidden mt-0.5 ${theme.barTrack}`}>
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${theme.barFill}`}
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & % Pill */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-extrabold text-[#07193F] text-xs sm:text-sm">
                            {item.value.toFixed(2)} {group.currency}
                          </span>
                          <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md ${theme.pillBg}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Footer Note */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium pt-1">
              <Info className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Percentages may not add up to 100% due to rounding.</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs font-bold text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            No contributor data recorded yet in this cycle.
          </div>
        )}
      </div>

      {/* OVERVIEW (MY CONTRIBUTION & AVG PER PERSON) */}
      <div className="space-y-2">
        <h3 className="text-sm font-black text-[#071E55] tracking-wide px-1">Overview</h3>
        <GlassContainer variant="card" className="p-5 md:p-6 border border-slate-200/80 shadow-lg shadow-blue-950/[0.03] bg-white text-slate-900 rounded-3xl">
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            {/* Left Column: My Contribution */}
            <div className="flex flex-col items-center justify-center pr-2 sm:pr-6 text-center space-y-3">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Ring */}
                  <path
                    className="text-slate-100"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress Ring */}
                  <path
                    className="text-[#0F3DFF] transition-all duration-500 ease-out"
                    strokeDasharray={`${Math.min(Math.max(myPercentage, 0), 100)}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F3DFF] mb-0.5" />
                  <span className="text-xs sm:text-sm font-black text-[#071E55]">{myPercentage.toFixed(1)}%</span>
                </div>
              </div>

              <div>
                <div className="text-base sm:text-xl font-black text-[#071E55]">
                  {mySpent.toFixed(2)} {group.currency}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">My Contribution</div>
              </div>
            </div>

            {/* Right Column: Avg. per Person */}
            <div className="flex flex-col items-center justify-center pl-2 sm:pl-6 text-center space-y-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-blue-50/70 border border-blue-100 flex flex-col items-center justify-center text-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F3DFF] mb-0.5" />
                <span className="text-xs sm:text-sm font-black text-[#071E55]">÷ {activeMembersCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold">members</span>
              </div>

              <div>
                <div className="text-base sm:text-xl font-black text-[#071E55]">
                  {avgPerPerson.toFixed(2)} {group.currency}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">Avg. per Person</div>
              </div>
            </div>
          </div>
        </GlassContainer>
      </div>

      {/* 4 Primary Category KPI Glass Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Mess Expense Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-slate-200/80 text-slate-900 bg-white shadow-md hover:shadow-xl hover:border-[#0F3DFF]/40 transition-all cursor-pointer rounded-3xl"
          onClick={() => onNavigateTab('expenses')}
        >
          <div className="flex items-center justify-between text-[#0F3DFF] mb-2">
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0F3DFF] px-2.5 py-0.5 rounded-full border border-blue-100">
              Mess
            </span>
          </div>
          <span className="text-xs text-slate-600 font-semibold block">Mess Food Expenses</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={messTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-[#071E55]"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-medium">
            {expenses.filter((e) => e.type === 'mess').length} Transactions
          </span>
        </GlassContainer>

        {/* General Expenses Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-slate-200/80 text-slate-900 bg-white shadow-md hover:shadow-xl hover:border-[#0F3DFF]/40 transition-all cursor-pointer rounded-3xl"
          onClick={() => onNavigateTab('expenses')}
        >
          <div className="flex items-center justify-between text-[#0F3DFF] mb-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0F3DFF] px-2.5 py-0.5 rounded-full border border-blue-100">
              General
            </span>
          </div>
          <span className="text-xs text-slate-600 font-semibold block">General Room Items</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={generalTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-[#071E55]"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-medium">
            {expenses.filter((e) => e.type === 'general').length} Items
          </span>
        </GlassContainer>

        {/* Utilities Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-slate-200/80 text-slate-900 bg-white shadow-md hover:shadow-xl hover:border-[#0F3DFF]/40 transition-all cursor-pointer rounded-3xl"
          onClick={() => onNavigateTab('utilities')}
        >
          <div className="flex items-center justify-between text-[#0F3DFF] mb-2">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0F3DFF] px-2.5 py-0.5 rounded-full border border-blue-100">
              Utilities
            </span>
          </div>
          <span className="text-xs text-slate-600 font-semibold block">DEWA & WiFi Bills</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={utilitiesTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-[#071E55]"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-medium">
            {utilities.length} Utility Bills
          </span>
        </GlassContainer>

        {/* Landlord Rent Card */}
        <GlassContainer
          variant="card"
          className="p-4 md:p-5 border border-slate-200/80 text-slate-900 bg-white shadow-md hover:shadow-xl hover:border-[#0F3DFF]/40 transition-all cursor-pointer rounded-3xl"
          onClick={() => onNavigateTab('utilities')}
        >
          <div className="flex items-center justify-between text-[#0F3DFF] mb-2">
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0F3DFF] px-2.5 py-0.5 rounded-full border border-blue-100">
              Rent
            </span>
          </div>
          <span className="text-xs text-slate-600 font-semibold block">Landlord Monthly Rent</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={rentTotal}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-[#071E55]"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-medium">
            Status: {rent?.status === 'paid' ? 'Paid' : 'Pending'}
          </span>
        </GlassContainer>
      </div>

      {/* Central Google Sheets Integration & Admin Panel Info (Admin Only) */}
      {currentUser?.role === 'admin' && (
        <GlassContainer variant="card" className="p-5 md:p-6 border border-slate-200/80 text-slate-900 bg-white shadow-lg space-y-4 rounded-3xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF]">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#07193F]">Google Sheets Central Synchronization</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Spreadsheet ID: <code className="text-[#07193F] font-mono font-bold">{group.spreadsheetId ? group.spreadsheetId.substring(0, 16) + '...' : '1-VBgqW...'}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-blue-50/70 border border-blue-100 text-[#0052FF] font-semibold px-3.5 py-1.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-2xs">
                <RefreshCw className={`w-3.5 h-3.5 text-[#0052FF] ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Auto-Syncing...' : 'Auto-Synced'}</span>
              </div>

              <a
                href={`https://docs.google.com/spreadsheets/d/${group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}/edit`}
                target="_blank"
                rel="noreferrer"
                className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-bold px-3.5 py-1.5 rounded-2xl text-xs flex items-center gap-1.5 border border-blue-400/20 transition-all cursor-pointer shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5 text-white" />
                <span>Open Sheet</span>
              </a>
            </div>
          </div>
        </GlassContainer>
      )}

      {/* RECENT EXPENSES Section */}
      <GlassContainer variant="card" className="p-5 border border-slate-200/80 shadow-xl shadow-blue-950/[0.04] bg-white text-slate-900 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#0052FF]" />
              <h3 className="text-base font-black text-[#07193F] tracking-wide uppercase">
                RECENT EXPENSES
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Running Month ({group.billingCycle || 'Current Cycle'}) • Sorted User, Date & Amount Wise (Last Entry First)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] font-extrabold bg-[#0052FF] text-white px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
              {expenses.length} Total Expenses
            </span>
          </div>
        </div>

        {/* Member Filter Pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by User:</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedUserFilter('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedUserFilter === 'all'
                  ? 'bg-[#0052FF] text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              All Users ({expenses.length})
            </button>
            {group.members.map((member) => {
              const userCount = expenses.filter((e) => e.paidById === member.id).length;
              const userTotal = expenses.filter((e) => e.paidById === member.id).reduce((sum, e) => sum + e.amount, 0);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedUserFilter(member.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedUserFilter === member.id
                      ? 'bg-[#0052FF] text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{member.name}</span>
                  <span className="text-[10px] opacity-80">({userCount} • {userTotal.toFixed(0)} {group.currency})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expenses List */}
        {(() => {
          const displayedList = expenses.filter((e) => {
            if (selectedUserFilter === 'all') return true;
            return e.paidById === selectedUserFilter;
          });

          if (displayedList.length === 0) {
            return (
              <div className="py-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-500">No expenses recorded for this user in the running month.</p>
              </div>
            );
          }

          const visibleItems = showAllExpenses ? displayedList : displayedList.slice(0, 8);

          return (
            <div className="space-y-3">
              {visibleItems.map((exp) => {
                const payer = group.members.find((m) => m.id === exp.paidById);
                const isMess = exp.type === 'mess';

                return (
                  <div
                    key={exp.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-200 hover:shadow-md transition-all text-slate-900"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* User Full Name Badge in solid blue */}
                      <div className="bg-[#0052FF] text-white font-extrabold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl shrink-0 shadow-2xs">
                        {payer?.name || exp.paidById}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-[#07193F] line-clamp-1">{cleanExpenseTitle(exp.title)}</h4>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-600">
                            {isMess ? 'Mess Food' : 'General'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-[#0052FF]" />
                            Date: {exp.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amount & Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-0 pt-2.5 sm:pt-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Amount</span>
                        <DualCurrencyDisplay
                          amount={exp.amount}
                          baseCurrency={group.currency}
                          preferredCurrency={preferredCurrency}
                          customRates={customRates}
                          layout="stacked"
                          baseClassName="text-base sm:text-lg font-black text-[#07193F] block"
                        />
                      </div>

                      {onDeleteExpense && currentUser?.role === 'admin' && (
                        <div>
                          {deleteConfirmId === exp.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-2xl border border-rose-200 shadow-md">
                              <span className="text-[11px] text-rose-800 font-bold px-1">Delete?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteExpense(exp.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all border border-rose-500/20 cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(exp.id)}
                              className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 bg-white rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              title="Delete expense"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                              <span className="text-xs font-bold text-rose-600">Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {displayedList.length > 8 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllExpenses(!showAllExpenses)}
                    className="px-4 py-2 bg-[#0052FF] hover:bg-[#0047E0] text-white text-xs font-bold rounded-2xl border border-blue-400/20 hover:shadow-lg transition-all cursor-pointer shadow-xs"
                  >
                    {showAllExpenses ? 'Show Less' : `View All (${displayedList.length} Expenses)`}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </GlassContainer>
    </div>
  );
};
