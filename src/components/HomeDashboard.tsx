import React from 'react';
import { Group, Expense, UtilityBill, RentContribution } from '../types';
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
}) => {
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
  const myMember = group.members.find((m) => m.name.includes('Shakil') || m.id === 'm3') || group.members[0];
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
        variant="emerald"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border border-white/30 shadow-2xl relative overflow-hidden"
      >
        {/* Background Decorative Rings */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none"></div>
        <div className="absolute -left-12 -top-12 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-200 bg-white/15 px-3.5 py-1 rounded-full border border-white/20 backdrop-blur-md">
              {group.name}
            </span>
            <span className="text-xs text-emerald-100/90 flex items-center gap-1 font-semibold bg-black/20 px-3 py-1 rounded-full border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-[#F9A826]" />
              Cycle: {group.billingCycle}
            </span>
          </div>

          <div>
            <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Total Group Expenses</p>
            <div className="mt-1">
              <DualCurrencyDisplay
                amount={totalExpenses}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="hero"
                baseClassName="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
            <span>Created: {group.createdAt}</span>
            <span className="flex items-center gap-1.5 text-[#F9A826] font-bold bg-white/10 px-2.5 py-1 rounded-xl">
              <Sparkles className="w-3.5 h-3.5" />
              Direct Google Sheet Sync
            </span>
          </div>
        </div>
      </GlassContainer>

      {/* 2. Settlement Info Box */}
      <GlassContainer
        variant="amber"
        blur="2xl"
        className="p-4 rounded-3xl border border-white/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/40 text-[#0B4A3F] font-black flex items-center justify-center shrink-0 border border-white/50 shadow-xs">
            <Receipt className="w-5 h-5 text-[#0B4A3F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white">Current Settlement Cycle</h3>
              <span className="bg-slate-950/80 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-400/30">
                Pending Settlement
              </span>
            </div>
            <p className="text-xs text-white font-semibold mt-0.5">
              Cycle: <strong>{group.billingCycle}</strong> (Mess meal rate: ~{dailyMealRate.toFixed(2)} AED/day)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={() => onNavigateTab('report')}
            className="bg-[#0B4A3F] hover:bg-[#145C4E] text-white text-xs font-extrabold px-3.5 py-2 rounded-2xl transition-all flex items-center gap-1.5 shadow-lg shadow-[#0B4A3F]/30 active:scale-95 border border-white/20"
          >
            <span>Calculate Settlements</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#F9A826]" />
          </button>
        </div>
      </GlassContainer>

      {/* 3. Quick Action Buttons (4 row) */}
      <div>
        <h3 className="text-xs font-black text-emerald-200 uppercase tracking-wider mb-3 px-1 drop-shadow-xs">
          Quick Navigation & Category Actions
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateTab('expenses')}
            className="flex flex-col items-center justify-center p-3.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-3xl shadow-xl backdrop-blur-2xl transition-all group text-center active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform border border-emerald-400/30">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Expenses</span>
            <span className="text-[10px] text-emerald-200/80 font-medium">{expenses.length} Added</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-3xl shadow-xl backdrop-blur-2xl transition-all group text-center active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform border border-amber-400/30">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Utilities</span>
            <span className="text-[10px] text-amber-200/80 font-medium">DEWA, WiFi</span>
          </button>

          <button
            onClick={() => onNavigateTab('utilities')}
            className="flex flex-col items-center justify-center p-3.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-3xl shadow-xl backdrop-blur-2xl transition-all group text-center active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform border border-blue-400/30">
              <HomeIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Rent</span>
            <span className="text-[10px] text-blue-200/80 font-medium">{rent.totalRent} AED</span>
          </button>

          <button
            onClick={() => onNavigateTab('report')}
            className="flex flex-col items-center justify-center p-3.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-3xl shadow-xl backdrop-blur-2xl transition-all group text-center active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform border border-purple-400/30">
              <ReportIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Report</span>
            <span className="text-[10px] text-purple-200/80 font-medium">Balances</span>
          </button>
        </div>
      </div>

      {/* 4. Categories Section: Mess Expense & General Expense */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black text-emerald-200 uppercase tracking-wider drop-shadow-xs">
            Categories Breakdown
          </h3>
          <span className="text-xs text-emerald-200/80 font-semibold">2 Main Categories</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mess Expense Card */}
          <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Mess Expense</h4>
                  <p className="text-[11px] text-emerald-100/80">Groceries, Meat, Rice, Vegetables</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-400/30">
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
                  baseClassName="text-2xl font-black text-white"
                />
                <span className="text-xs font-semibold text-emerald-300 bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-400/30">
                  Rate: ~{dailyMealRate.toFixed(2)} AED/day
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden border border-white/10">
                <div
                  className="bg-[#F9A826] h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${totalExpenses > 0 ? (messTotal / totalExpenses) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </GlassContainer>

          {/* General Expense Card */}
          <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">General Expense</h4>
                  <p className="text-[11px] text-amber-100/80">Water, Detergent, Gas, Room items</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-400/30">
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
                  baseClassName="text-2xl font-black text-white"
                />
                <span className="text-xs text-amber-100/80 font-medium">Split equally among {activeMembersCount} members</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden border border-white/10">
                <div
                  className="bg-[#F9A826] h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${totalExpenses > 0 ? (generalTotal / totalExpenses) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </GlassContainer>
        </div>
      </div>

      {/* 5. Overview Section: My Contribution & Avg. per Person */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassContainer variant="card" className="p-4 border border-white/30 shadow-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
              My Paid Contribution
            </span>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <DualCurrencyDisplay
                amount={mySpent}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="pill"
                baseClassName="text-2xl font-black text-white"
              />
              <span className="text-xs font-bold text-emerald-300 bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                {myPercentage}% of Group
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 mt-1">
              Logged in as: <strong className="text-white">{myMember.name}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 text-amber-300 border border-white/30 flex items-center justify-center font-bold text-lg shadow-md">
            {myMember.avatar}
          </div>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-white/30 shadow-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              Avg. Expense per Person
            </span>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <DualCurrencyDisplay
                amount={avgPerPerson}
                baseCurrency={group.currency}
                preferredCurrency={preferredCurrency}
                customRates={customRates}
                layout="pill"
                baseClassName="text-2xl font-black text-white"
              />
              <span className="text-xs text-amber-100/80">/ {activeMembersCount} Members</span>
            </div>
            <p className="text-[11px] text-amber-100/80 mt-1">Based on current cycle total</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 text-amber-300 border border-white/30 flex items-center justify-center shadow-md">
            <Users className="w-6 h-6" />
          </div>
        </GlassContainer>
      </div>

      {/* 6. Top Contributors Chart */}
      <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#F9A826]" />
            Top Contributors (Paid Out of Pocket)
          </h3>
          <span className="text-xs text-emerald-200/80">Shared Gmail Master Account</span>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} AED`, 'Amount Paid']}
                    contentStyle={{ borderRadius: '16px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend list */}
            <div className="w-full md:w-1/2 space-y-2">
              {contributorData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs p-2.5 rounded-2xl bg-white/10 border border-white/20 text-white">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    ></span>
                    <span className="font-bold text-white">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-[#F9A826]">{item.value.toFixed(2)} AED</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-emerald-200/80 py-6 text-center">No expenses added yet in this cycle.</p>
        )}
      </GlassContainer>

      {/* 7. Recent Expenses Vertical List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black text-emerald-200 uppercase tracking-wider">
            Recent Expenses ({expenses.length})
          </h3>
          <button
            onClick={() => onNavigateTab('expenses')}
            className="text-xs font-extrabold text-[#F9A826] hover:underline"
          >
            View All
          </button>
        </div>

        <div className="space-y-3">
          {expenses.slice(0, 5).map((exp) => {
            const payer = group.members.find((m) => m.id === exp.paidById);
            const isMess = exp.type === 'mess';

            return (
              <div
                key={exp.id}
                className="bg-white/10 backdrop-blur-2xl border border-white/30 rounded-3xl p-4 shadow-xl flex items-center justify-between gap-3 hover:border-white/50 hover:bg-white/15 transition-all text-white"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl font-black flex items-center justify-center shrink-0 border border-white/30 ${
                      isMess
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {payer?.avatar || 'M'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-white line-clamp-1">{exp.title}</h4>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          isMess
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-400/30'
                            : 'bg-amber-950/60 text-amber-300 border-amber-400/30'
                        }`}
                      >
                        {isMess ? 'Mess' : 'General'}
                      </span>
                    </div>

                    <p className="text-xs text-emerald-100/80 mt-0.5">
                      Paid by <strong className="text-white">{payer?.name || exp.paidById}</strong> • {exp.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <DualCurrencyDisplay
                      amount={exp.amount}
                      baseCurrency={group.currency}
                      preferredCurrency={preferredCurrency}
                      customRates={customRates}
                      layout="stacked"
                      baseClassName="text-base font-black text-white block"
                    />
                    <span className="text-[10px] text-emerald-200/70 block mt-0.5">
                      Shared ({exp.sharedWithIds.length} members)
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteExpense(exp.id)}
                    className="p-2 text-rose-300/70 hover:text-rose-200 hover:bg-rose-500/20 rounded-xl transition-colors border border-transparent hover:border-rose-400/30"
                    title="Delete Expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={onOpenAddExpense}
        className="fixed bottom-20 right-6 z-40 bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white focus:outline-none"
        title="Add New Expense"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>
    </div>
  );
};
