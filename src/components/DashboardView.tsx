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

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#F97316', '#14B8A6', '#6366F1', '#E11D48'];

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

  // Meal Rate calculation
  const totalMessDays = group.members.reduce((sum, m) => sum + (m.daysPresent || 0), 0) || 1;
  const dailyMealRate = messTotal / totalMessDays;

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

      {/* TOP CONTRIBUTORS (PAID OUT OF POCKET) */}
      <GlassContainer variant="card" className="p-5 border border-black shadow-md bg-white text-slate-900 rounded-3xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-900" />
            Top Contributors (Paid Out of Pocket)
          </h3>
          <span className="text-[10px] font-bold text-slate-600 uppercase bg-slate-100 px-2.5 py-1 rounded-full border border-black/20">
            Current Cycle
          </span>
        </div>

        {contributorData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={contributorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {contributorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} ${group.currency}`, 'Amount Paid']}
                    contentStyle={{ borderRadius: '16px', background: '#ffffff', border: '2px solid #000000', color: '#000000' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend list */}
            <div className="w-full md:w-1/2 space-y-2">
              {contributorData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs p-2.5 rounded-2xl bg-white border border-black text-slate-900">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black shadow-sm shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    ></span>
                    <span className="font-bold text-slate-900">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-950">{item.value.toFixed(2)} {group.currency}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs font-bold text-slate-600 bg-slate-50 rounded-2xl border border-dashed border-black">
            No contributor data recorded yet in this cycle.
          </div>
        )}
      </GlassContainer>

      {/* OVERVIEW (MY CONTRIBUTION & AVG PER PERSON) */}
      <div className="space-y-2">
        <h3 className="text-sm font-extrabold text-teal-900 tracking-wide px-1">Overview</h3>
        <GlassContainer variant="card" className="p-5 md:p-6 border border-black shadow-md bg-white text-slate-900 rounded-3xl">
          <div className="grid grid-cols-2 divide-x divide-slate-200">
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
                    className="text-emerald-800 transition-all duration-500 ease-out"
                    strokeDasharray={`${Math.min(Math.max(myPercentage, 0), 100)}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800 mb-0.5" />
                  <span className="text-xs sm:text-sm font-black text-slate-900">{myPercentage.toFixed(1)}%</span>
                </div>
              </div>

              <div>
                <div className="text-base sm:text-xl font-extrabold text-slate-900">
                  {mySpent.toFixed(2)} {group.currency}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">My Contribution</div>
              </div>
            </div>

            {/* Right Column: Avg. per Person */}
            <div className="flex flex-col items-center justify-center pl-2 sm:pl-6 text-center space-y-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-50/80 border border-emerald-100/80 flex flex-col items-center justify-center text-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800 mb-0.5" />
                <span className="text-xs sm:text-sm font-black text-emerald-950">÷ {activeMembersCount}</span>
                <span className="text-[10px] text-slate-500 font-medium">members</span>
              </div>

              <div>
                <div className="text-base sm:text-xl font-extrabold text-slate-900">
                  {avgPerPerson.toFixed(2)} {group.currency}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Avg. per Person</div>
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

      {/* RECENT EXPENSES Section */}
      <GlassContainer variant="card" className="p-5 border-2 border-black shadow-xl bg-white text-slate-900 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-950" />
              <h3 className="text-base font-black text-slate-950 tracking-wide uppercase">
                RECENT EXPENSES
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-bold mt-0.5">
              Running Month ({group.billingCycle || 'Current Cycle'}) • Sorted User, Date & Amount Wise (Last Entry First)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] font-black bg-black text-white px-3 py-1 rounded-full uppercase tracking-wider">
              {expenses.length} Total Expenses
            </span>
          </div>
        </div>

        {/* Member Filter Pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">Filter by User:</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedUserFilter('all')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-black border transition-all shrink-0 cursor-pointer ${
                selectedUserFilter === 'all'
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-black/30'
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
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedUserFilter === member.id
                      ? 'bg-black text-white border-black shadow-xs font-black'
                      : 'bg-white hover:bg-slate-100 text-slate-900 border-black'
                  }`}
                >
                  <span>{member.avatar}</span>
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
              <div className="py-8 text-center bg-slate-50 border border-black rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-600">No expenses recorded for this user in the running month.</p>
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
                    className="bg-white border-2 border-black rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:shadow-md transition-all text-slate-900"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* User Avatar */}
                      <div className="w-11 h-11 rounded-2xl font-black bg-black text-white flex items-center justify-center shrink-0 border border-black shadow-xs text-sm">
                        {payer?.avatar || 'M'}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-950 line-clamp-1">{cleanExpenseTitle(exp.title)}</h4>
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-black bg-slate-100 text-slate-900">
                            {isMess ? 'Mess Food' : 'General'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
                          <span>User: <strong className="text-slate-950 font-black">{payer?.name || exp.paidById}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-extrabold text-slate-900">
                            <Calendar className="w-3.5 h-3.5 text-slate-800" />
                            Date: {exp.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amount & Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-0 pt-2.5 sm:pt-0 border-slate-200">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Amount</span>
                        <DualCurrencyDisplay
                          amount={exp.amount}
                          baseCurrency={group.currency}
                          preferredCurrency={preferredCurrency}
                          customRates={customRates}
                          layout="stacked"
                          baseClassName="text-base sm:text-lg font-black text-slate-950 block"
                        />
                      </div>

                      {onDeleteExpense && currentUser?.role === 'admin' && (
                        <div>
                          {deleteConfirmId === exp.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-2xl border border-black shadow-md">
                              <span className="text-[11px] text-rose-900 font-bold px-1">Delete?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteExpense(exp.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2.5 py-1 bg-black hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all border border-black cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-white text-black font-bold text-xs rounded-xl border border-black transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(exp.id)}
                              className="px-2.5 py-1.5 text-black hover:bg-slate-100 bg-white rounded-xl transition-all border border-black cursor-pointer flex items-center gap-1.5 shadow-xs"
                              title="Delete expense"
                            >
                              <Trash2 className="w-4 h-4 text-black" />
                              <span className="text-xs font-bold text-black">Delete</span>
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
                    className="px-4 py-2 bg-black text-white text-xs font-black rounded-2xl border border-black hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
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
