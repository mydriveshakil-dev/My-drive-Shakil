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
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { GlassContainer } from './GlassContainer';

interface HomeDashboardProps {
  group: Group;
  expenses: Expense[];
  utilities: UtilityBill[];
  rent: RentContribution;
  onOpenAddExpense: () => void;
  onNavigateTab: (tab: 'home' | 'expenses' | 'utilities' | 'report' | 'group') => void;
  onDeleteExpense: (id: string) => void;
  preferredCurrency?: string;
  customRates?: Record<string, number>;
  onOpenGroupChat?: () => void;
  currentUser?: UserAuthProfile | null;
}

const COLORS = ['#F9A826', '#0B4A3F', '#10B981', '#3B82F6', '#EC4899'];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  group,
  expenses,
  utilities,
  rent,
  onOpenAddExpense,
  onNavigateTab,
  onDeleteExpense,
  preferredCurrency = 'USD',
  customRates,
  onOpenGroupChat,
  currentUser,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

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

  // "My Contribution" (Finding Shakil or m3)
  const myMember = (group?.members || []).find((m) => m?.name?.includes('Shakil') || m?.id === 'm3') || group?.members?.[0] || {
    id: 'm3',
    name: 'Shakil Hossain',
    role: 'MEMBER',
    avatar: '👨‍💼',
    active: true,
    daysPresent: 30,
  };
  const mySpent = expenses
    .filter((e) => e.paidById === myMember.id)
    .reduce((sum, e) => sum + e.amount, 0);
  const myPercentage = totalExpenses > 0 ? Math.round((mySpent / totalExpenses) * 100) : 0;

  // Meal Rate calculation
  const totalMessDays = group.members.reduce((sum, m) => sum + (m.daysPresent || 0), 0) || 1;
  const dailyMealRate = messTotal / totalMessDays;

  // Top Contributors Pie Chart Data
  const contributorData = group.members.map((member) => {
    const totalPaid = expenses
      .filter((e) => e.paidById === member.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: member.name,
      value: Math.round(totalPaid * 100) / 100,
    };
  }).filter((item) => item.value > 0);

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Large Total Expense Card */}
      <GlassContainer
        variant="card"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border-2 border-black shadow-xl bg-white text-slate-900 relative overflow-hidden"
      >
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white bg-black px-3.5 py-1 rounded-full shadow-xs border border-black">
                {group.name}
              </span>
              <span className="text-xs text-slate-900 flex items-center gap-1 font-bold bg-white px-3 py-1 rounded-full border border-black">
                <Calendar className="w-3.5 h-3.5 text-slate-900" />
                Cycle: {group.billingCycle}
              </span>
            </div>
            {/* Logged in User Name under Group Name */}
            <div className="text-xs text-slate-700 font-bold flex items-center gap-1.5 px-1 pt-0.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-900" />
              <span>Logged in as: <strong className="text-slate-900 font-extrabold">{currentUser?.name || 'Member'}</strong></span>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">TOTAL EXPENSES</p>
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

          <div className="pt-2 border-t border-black/20 flex items-center justify-between text-xs text-slate-600">
            <span>Created: {group.createdAt}</span>
          </div>
        </div>
      </GlassContainer>

      {/* 2. Mess Food Expense Only Box */}
      <GlassContainer
        variant="card"
        blur="2xl"
        className="p-5 rounded-3xl border-2 border-black shadow-lg bg-white text-slate-900 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/15">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black text-white font-black flex items-center justify-center shrink-0 border border-black shadow-xs">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-950 tracking-tight">
                  Mess Food Expenses (মেস খাবার খরচ)
                </h3>
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-700 shadow-xs">
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
              className="bg-black hover:bg-slate-800 text-white text-xs font-black px-3.5 py-2 rounded-2xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 border border-black cursor-pointer"
            >
              <span>Settlement Report</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Amount & Key Metrics Row for Mess Food Expense Only */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-black/20">
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

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-black/20">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Daily Meal Rate
            </span>
            <div className="text-2xl font-black text-slate-950 mt-1">
              ~{dailyMealRate.toFixed(2)} <span className="text-sm font-bold text-slate-700">{group.currency}/day</span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold block mt-1">
              Mess Rate per Person/Day
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-black/20">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
              Total Mess Days Logged
            </span>
            <div className="text-2xl font-black text-slate-950 mt-1">
              {totalMessDays} <span className="text-sm font-bold text-slate-700">Days</span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold block mt-1">
              Sum of active member days
            </span>
          </div>
        </div>
      </GlassContainer>

      {/* 3. Quick Action Buttons (4 row) */}
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 px-1">
          Quick Navigation & Category Actions
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateTab('expenses')}
            className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-slate-100 border border-black rounded-3xl shadow-md transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform border border-black">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Expenses</span>
            <span className="text-[10px] text-slate-600 font-medium">{expenses.length} Added</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-slate-100 border border-black rounded-3xl shadow-md transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform border border-black">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Utilities</span>
            <span className="text-[10px] text-slate-600 font-medium">DEWA, WiFi</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-slate-100 border border-black rounded-3xl shadow-md transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform border border-black">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Rent</span>
            <span className="text-[10px] text-slate-600 font-medium">{rent.totalRent} AED</span>
          </button>

          <button
            onClick={() => onNavigateTab('report')}
            className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-slate-100 border border-black rounded-3xl shadow-md transition-all group text-center active:scale-95 cursor-pointer text-slate-900"
          >
            <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform border border-black">
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
          <GlassContainer variant="card" className="p-5 border border-black shadow-md bg-white text-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center border border-black">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Mess Expense</h4>
                  <p className="text-[11px] text-slate-600">Groceries, Meat, Rice, Vegetables</p>
                </div>
              </div>
              <span className="text-xs font-bold text-white bg-black px-2.5 py-1 rounded-lg border border-black">
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
                <span className="text-xs font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-black">
                  Rate: ~{dailyMealRate.toFixed(2)} AED/day
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-black">
                <div
                  className="bg-black h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalExpenses > 0 ? (messTotal / totalExpenses) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </GlassContainer>

          {/* General Expense Card */}
          <GlassContainer variant="card" className="p-5 border border-black shadow-md bg-white text-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center border border-black">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">General Expense</h4>
                  <p className="text-[11px] text-slate-600">Water, Detergent, Gas, Room items</p>
                </div>
              </div>
              <span className="text-xs font-bold text-white bg-black px-2.5 py-1 rounded-lg border border-black">
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
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden border border-black">
                <div
                  className="bg-black h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalExpenses > 0 ? (generalTotal / totalExpenses) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </GlassContainer>
        </div>
      </div>

      {/* 5. Overview Section: My Contribution & Avg. per Person */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassContainer variant="card" className="p-4 border border-black shadow-md bg-white text-slate-900 flex items-center justify-between">
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
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-black">
                {myPercentage}% of Group
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Logged in as: <strong className="text-slate-900">{myMember.name}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-black text-white border border-black flex items-center justify-center font-bold text-lg shadow-md">
            {myMember.avatar}
          </div>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-black shadow-md bg-white text-slate-900 flex items-center justify-between">
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
          <div className="w-12 h-12 rounded-2xl bg-black text-white border border-black flex items-center justify-center shadow-md">
            <Users className="w-6 h-6" />
          </div>
        </GlassContainer>
      </div>

      {/* 6. Top Contributors Chart */}
      <GlassContainer variant="card" className="p-5 border border-black shadow-md bg-white text-slate-900">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-900" />
            Top Contributors (Paid Out of Pocket)
          </h3>
          <span className="text-xs text-slate-600">Shared Gmail Master Account</span>
        </div>

        {contributorData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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
                      <Cell key={`cell-${index}`} fill={['#000000', '#333333', '#666666', '#888888', '#aaaaaa'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} AED`, 'Amount Paid']}
                    contentStyle={{ borderRadius: '16px', background: '#ffffff', border: '2px solid #000000', color: '#000000' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend list */}
            <div className="w-full md:w-1/2 space-y-2">
              {contributorData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs p-2.5 rounded-2xl bg-white border border-black text-slate-900">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ['#000000', '#333333', '#666666', '#888888', '#aaaaaa'][idx % 5] }}
                    ></span>
                    <span className="font-bold text-slate-900">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-950">{item.value.toFixed(2)} AED</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-600 py-6 text-center">No expenses added yet in this cycle.</p>
        )}
      </GlassContainer>

      {/* 7. Recent Expenses Vertical List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>Expenses Data ({expenses.length})</span>
            {currentUser?.role === 'admin' && (
              <span className="text-[10px] text-white font-bold bg-black px-2 py-0.5 rounded-full border border-black">
                Admin Control
              </span>
            )}
          </h3>
          {expenses.length > 5 && (
            <button
              onClick={() => setShowAllExpenses(!showAllExpenses)}
              className="text-xs font-extrabold text-slate-900 hover:underline cursor-pointer"
            >
              {showAllExpenses ? 'Show Less' : `View All (${expenses.length})`}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {(showAllExpenses ? expenses : expenses.slice(0, 5)).map((exp) => {
            const payer = group.members.find((m) => m.id === exp.paidById);
            const isMess = exp.type === 'mess';

            return (
              <div
                key={exp.id}
                className="bg-white border border-black rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-black transition-all text-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl font-black bg-black text-white flex items-center justify-center shrink-0 border border-black">
                    {payer?.avatar || 'M'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 line-clamp-1">{exp.title}</h4>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border border-black bg-white text-slate-900">
                        {isMess ? 'Mess' : 'General'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5">
                      Paid by <strong className="text-slate-900">{payer?.name || exp.paidById}</strong> • {exp.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-0 pt-2 sm:pt-0 border-black/20">
                  <div className="text-left sm:text-right">
                    <DualCurrencyDisplay
                      amount={exp.amount}
                      baseCurrency={group.currency}
                      preferredCurrency={preferredCurrency}
                      customRates={customRates}
                      layout="stacked"
                      baseClassName="text-base font-black text-slate-950 block"
                    />
                    <span className="text-[10px] text-slate-600 block mt-0.5">
                      Shared ({exp.sharedWithIds.length} members)
                    </span>
                  </div>

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
                          className="px-2.5 py-1 bg-black hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition-all border border-black cursor-pointer"
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
