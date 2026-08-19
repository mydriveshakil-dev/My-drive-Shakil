import React, { useState } from 'react';
import { Group, Expense, UtilityBill, RentContribution, UserAuthProfile } from '../types';
import {
  Wallet,
  Zap,
  Home as HomeIcon,
  PieChart as ReportIcon,
  Plus,
  TrendingUp,
  Users,
  Utensils,
  ShoppingBag,
  ArrowRight,
  Calendar,
  Sparkles,
  Receipt,
  Trash2,
  MessageCircle,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { GlassContainer } from './GlassContainer';
import { MemberAvatar } from './MemberAvatar';
import { cleanExpenseTitle } from '../utils/textCleaner';
import { getLoggedInMember } from '../utils/permissionUtils';

interface HomeDashboardProps {
  group: Group;
  expenses: Expense[];
  utilities: UtilityBill[];
  rent: RentContribution;
  onOpenAddExpense: () => void;
  onNavigateTab: (tab: 'home' | 'expenses' | 'utilities' | 'report' | 'group') => void;
  onDeleteExpense: (id: string) => void;
  onRestoreExpenses?: () => void;
  preferredCurrency?: string;
  customRates?: Record<string, number>;
  onOpenGroupChat?: () => void;
  currentUser?: UserAuthProfile | null;
}

const COLORS = ['#48BB47', '#CDDC39', '#FFC107', '#E91E63', '#2196F3', '#9C27B0', '#00BCD4', '#FF9800'];

const RADIAN = Math.PI / 180;
const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: any) => {
  if (percent < 0.01) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={percent < 0.08 ? 9 : 11}
      fontWeight={800}
      style={{
        filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.6))',
      }}
    >
      {typeof value === 'number' ? value.toFixed(2) : value}
    </text>
  );
};

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  group,
  expenses,
  utilities,
  rent,
  onOpenAddExpense,
  onNavigateTab,
  onDeleteExpense,
  onRestoreExpenses,
  preferredCurrency = 'USD',
  customRates,
  onOpenGroupChat,
  currentUser,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');

  // Calculations
  const messTotal = expenses
    .filter((e) => e.type === 'mess')
    .reduce((sum, e) => sum + e.amount, 0);

  const generalTotal = expenses
    .filter((e) => e.type === 'general')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = messTotal + generalTotal;
  const activeMembersCount = group.members.filter((m) => m.active).length || 1;
  const avgPerPerson = totalExpenses / activeMembersCount;

  // "My Contribution" (Matching logged in member or fallback)
  const loggedInMember = getLoggedInMember(group, currentUser);
  const myMember =
    loggedInMember ||
    (group?.members || []).find((m) => m?.name?.includes('Shakil') || m?.id === 'm3') ||
    group?.members?.[0] || {
      id: 'm3',
      name: currentUser?.name || 'Shakil Hossain',
      role: 'MEMBER',
      avatar: currentUser?.avatar || '👨‍💼',
      active: true,
      daysPresent: 30,
    };

  const currentUserName =
    currentUser?.name || currentUser?.identity?.fullName || myMember.name || 'Member';
  const currentUserAvatar =
    currentUser?.avatar || currentUser?.identity?.photoUrl || myMember.avatar || '';

  const mySpent = expenses
    .filter((e) => e.paidById === myMember.id)
    .reduce((sum, e) => sum + e.amount, 0);
  const myPercentage = totalExpenses > 0 ? Math.round((mySpent / totalExpenses) * 100) : 0;

  // Mess calculation per person
  const messMembersCount = (group?.members || []).filter((m) => m.active).length || 1;
  const messPerMember = messTotal / messMembersCount;

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

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Large Total Expense Card */}
      <div
        className="rounded-3xl neu-upper text-slate-900 overflow-hidden"
      >
        {/* Top Dark Navy Header Band */}
        <div className="bg-[#07193F] text-white px-5 py-3.5 flex items-center justify-between font-bold text-xs uppercase tracking-wider flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-white" />
            <span>ROOM EXPENSE OVERVIEW</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold bg-[#0B2A66] px-3 py-1 rounded-full border border-blue-400/30">
              {group.name}
            </span>
            <span className="text-[11px] font-extrabold bg-[#0B2A66] px-3 py-1 rounded-full border border-blue-400/30 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-300" />
              Cycle: {group.billingCycle}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-[11px] font-extrabold text-[#1E3A8A] uppercase tracking-wider">TOTAL EXPENSES</p>
            <div className="mt-1">
              <DualCurrencyDisplay
                amount={totalExpenses}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="hero"
                baseClassName="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-300/60 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Created: {group.createdAt}</span>
            <span>{group.members.length} Active Members</span>
          </div>
        </div>
      </div>

      {/* 2. Mess Food Expense Only Box */}
      <div
        className="p-5 rounded-3xl neu-upper text-slate-900 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-300/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#07193F] text-white font-black flex items-center justify-center shrink-0 shadow-xs">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-950 tracking-tight">
                  Mess Food Expenses (মেস খাবার খরচ)
                </h3>
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  Food & Grocery Only
                </span>
              </div>
              <p className="text-xs text-slate-600 font-bold mt-0.5">
                Excludes Room Rent & Utility Bills (রুম রেন্ট ও অন্যান্য বিল ব্যতীত)
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('report')}
              className="bg-[#07193F] hover:bg-[#0B2A66] text-white text-xs font-black px-3.5 py-2 rounded-2xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <span>Settlement Report</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Amount & Key Metrics Row for Mess Food Expense Only */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="neu-lower-sm p-3.5 rounded-2xl">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Total Mess Food Spent
            </span>
            <div className="mt-1">
              <DualCurrencyDisplay
                amount={messTotal}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="pill"
                baseClassName="text-2xl font-black text-slate-950"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-bold block mt-1">
              {expenses.filter((e) => e.type === 'mess').length} Grocery/Food Receipts
            </span>
          </div>

          <div className="neu-lower-sm p-3.5 rounded-2xl">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Mess Share Per Member
            </span>
            <div className="text-2xl font-black text-slate-950 mt-1">
              ~{messPerMember.toFixed(2)} <span className="text-sm font-bold text-slate-700">{group.currency}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold block mt-1">
              Equal split among mess members
            </span>
          </div>

          <div className="neu-lower-sm p-3.5 rounded-2xl">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Mess Members
            </span>
            <div className="text-2xl font-black text-slate-950 mt-1">
              {messMembersCount} <span className="text-sm font-bold text-slate-700">Members</span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold block mt-1">
              Active members sharing mess
            </span>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Buttons (4 row) */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 px-1">
          Quick Navigation & Category Actions
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateTab('expenses')}
            className="flex flex-col items-center justify-center p-3.5 neu-upper-btn rounded-3xl transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#07193F] text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Expenses</span>
            <span className="text-[10px] text-slate-600 font-medium">{expenses.length} Added</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3.5 neu-upper-btn rounded-3xl transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#07193F] text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Utilities</span>
            <span className="text-[10px] text-slate-600 font-medium">DEWA, WiFi</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3.5 neu-upper-btn rounded-3xl transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#07193F] text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-xs">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Rent</span>
            <span className="text-[10px] text-slate-600 font-medium">{rent.totalRent} AED</span>
          </button>

          <button
            onClick={() => onNavigateTab('report')}
            className="flex flex-col items-center justify-center p-3.5 neu-upper-btn rounded-3xl transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#07193F] text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-xs">
              <ReportIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Report</span>
            <span className="text-[10px] text-slate-600 font-medium">Balances</span>
          </button>
        </div>
      </div>

      {/* 4. Categories Section: Mess Expense & General Expense */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Categories Breakdown
          </h3>
          <span className="text-xs text-slate-600 font-semibold">2 Main Categories</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mess Expense Card */}
          <div className="p-5 neu-upper text-slate-900 rounded-3xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Mess Expense</h4>
                  <p className="text-[11px] text-slate-600">Groceries, Meat, Rice, Vegetables</p>
                </div>
              </div>
              <span className="text-xs font-bold text-white bg-black px-2.5 py-1 rounded-lg">
                {totalExpenses > 0 ? Math.round((messTotal / totalExpenses) * 100) : 0}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between flex-wrap gap-1">
                <DualCurrencyDisplay
                  amount={messTotal}
                  baseCurrency={group.currency}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  layout="pill"
                  baseClassName="text-2xl font-black text-slate-950"
                />
                <span className="text-xs font-semibold text-slate-900 neu-upper-sm px-2.5 py-1 rounded-lg">
                  ~{messPerMember.toFixed(2)} {group.currency}/member
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full neu-lower-sm rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalExpenses > 0 ? (messTotal / totalExpenses) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* General Expense Card */}
          <div className="p-5 neu-upper text-slate-900 rounded-3xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">General Expense</h4>
                  <p className="text-[11px] text-slate-600">Water, Detergent, Gas, Room items</p>
                </div>
              </div>
              <span className="text-xs font-bold text-white bg-black px-2.5 py-1 rounded-lg">
                {totalExpenses > 0 ? Math.round((generalTotal / totalExpenses) * 100) : 0}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between flex-wrap gap-1">
                <DualCurrencyDisplay
                  amount={generalTotal}
                  baseCurrency={group.currency}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  layout="pill"
                  baseClassName="text-2xl font-black text-slate-950"
                />
                <span className="text-xs text-slate-600 font-medium">Split equally among {activeMembersCount} members</span>
              </div>

              {/* Progress bar */}
              <div className="w-full neu-lower-sm rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalExpenses > 0 ? (generalTotal / totalExpenses) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Overview Section: My Contribution & Avg. per Person */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 neu-upper text-slate-900 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              My Paid Contribution
            </span>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <DualCurrencyDisplay
                amount={mySpent}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="pill"
                baseClassName="text-2xl font-black text-slate-950"
              />
              <span className="text-xs font-bold text-slate-900 neu-upper-sm px-2.5 py-0.5 rounded-full">
                {myPercentage}% of Group
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span>Logged in as:</span>
              <span className="inline-flex items-center gap-1 neu-upper-sm px-2 py-0.5 rounded-full font-bold text-slate-900 text-[11px]">
                <MemberAvatar
                  name={currentUserName}
                  avatar={currentUserAvatar}
                  size="xs"
                  className="w-4 h-4 text-[8px] shrink-0"
                />
                <span>{currentUserName}</span>
              </span>
            </div>
          </div>
          <MemberAvatar
            name={currentUserName}
            avatar={currentUserAvatar}
            size="lg"
            className="rounded-2xl neu-upper-sm shrink-0"
          />
        </div>

        <div className="p-4 neu-upper text-slate-900 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Avg. Expense per Person
            </span>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <DualCurrencyDisplay
                amount={avgPerPerson}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="pill"
                baseClassName="text-2xl font-black text-slate-950"
              />
              <span className="text-xs text-slate-600">/ {activeMembersCount} Members</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">Based on current cycle total</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 6. Top Contributors Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xl sm:text-2xl font-bold text-[#1e3a2b] tracking-tight">
            Top Contributors
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('report')}
            className="text-sm sm:text-base font-semibold text-[#1e3a2b] hover:text-black cursor-pointer transition-colors"
          >
            View All
          </button>
        </div>

        <div className="neu-upper rounded-[28px] p-4 sm:p-6">
          {contributorData.length > 0 ? (
            <div className="flex flex-row items-center justify-start sm:justify-center gap-3 sm:gap-8">
              {/* Pie Chart on Left */}
              <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] flex items-center justify-center shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contributorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={75}
                      dataKey="value"
                      isAnimationActive={false}
                      labelLine={false}
                      label={renderCustomizedPieLabel}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    >
                      {contributorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${value} AED`, 'Amount Paid']}
                      contentStyle={{ borderRadius: '12px', background: '#E7E7E7', border: 'none', boxShadow: 'inset -5px -5px 12px rgba(255,255,255,0.9), inset 5px 5px 12px rgba(174,174,192,0.8)', color: '#0f172a', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend list on Right */}
              <div className="flex flex-col space-y-2 sm:space-y-3 min-w-[140px] sm:min-w-[170px]">
                {contributorData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight leading-tight truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm shrink-0">
                      {item.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center font-medium">No expenses added yet in this cycle.</p>
          )}
        </div>
      </div>

      {/* 7. RECENT EXPENSES Section */}
      <div id="recent-expenses-section">
        <div className="p-5 neu-upper text-slate-900 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-300/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-950" />
              <h3 className="text-base font-black text-slate-950 tracking-wide uppercase">
                RECENT EXPENSES
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-bold mt-0.5">
              Running Month ({group.billingCycle || 'Current Cycle'}) • Sorted User, Date & Amount Wise
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {onRestoreExpenses && (
              <button
                type="button"
                onClick={onRestoreExpenses}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-full shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Restore deleted room expenses"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Expenses
              </button>
            )}
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
              className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                selectedUserFilter === 'all'
                  ? 'bg-black text-white shadow-xs'
                  : 'neu-upper-sm text-slate-900'
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
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedUserFilter === member.id
                      ? 'bg-black text-white shadow-xs font-black'
                      : 'neu-upper-sm text-slate-900'
                  }`}
                >
                  <MemberAvatar
                    name={member.name}
                    avatar={member.avatar}
                    size="xs"
                    className="border border-slate-300"
                  />
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
              <div className="py-8 text-center neu-lower-sm rounded-2xl p-6 space-y-3">
                <p className="text-xs font-bold text-slate-600">No expenses recorded for this user in the running month.</p>
                {onRestoreExpenses && (
                  <button
                    type="button"
                    onClick={onRestoreExpenses}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore Deleted Expenses
                  </button>
                )}
              </div>
            );
          }

          const reversedList = [...displayedList].reverse();
          const visibleItems = showAllExpenses ? reversedList : reversedList.slice(0, 5);

          return (
            <div className="space-y-3">
              {visibleItems.map((exp) => {
                const payer = group.members.find((m) => m.id === exp.paidById);
                const isMess = exp.type === 'mess';

                return (
                  <div
                    key={exp.id}
                    className="neu-upper-sm rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:scale-[1.01] transition-all text-slate-900"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* User Avatar */}
                      <MemberAvatar
                        name={payer?.name || exp.paidById}
                        avatar={payer?.avatar}
                        size="custom"
                        className="w-11 h-11 rounded-2xl shadow-xs text-sm shrink-0"
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-950 line-clamp-1">{cleanExpenseTitle(exp.title)}</h4>
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-900">
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
                          {exp.sharedWithIds && exp.sharedWithIds.length > 0 && exp.sharedWithIds.length < group.members.length && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-900">
                                Shared: {exp.sharedWithIds.length}/{group.members.length} members
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-0 pt-2.5 sm:pt-0 border-slate-300/60">
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

                      {currentUser?.role === 'admin' && (
                        <div>
                          {deleteConfirmId === exp.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-2xl shadow-md">
                              <span className="text-[11px] text-rose-900 font-bold px-1">Delete?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteExpense(exp.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2.5 py-1 bg-black hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 neu-upper-sm text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(exp.id)}
                              className="px-2.5 py-1.5 text-black neu-upper-sm rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
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

              {displayedList.length > 5 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllExpenses(!showAllExpenses)}
                    className="px-5 py-2.5 bg-black text-white text-xs font-black rounded-2xl hover:bg-slate-800 transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                  >
                    <span>{showAllExpenses ? 'Show Less (Last 5)' : `View All (${displayedList.length} Expenses)`}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        </div>
      </div>
    </div>
  );
};
