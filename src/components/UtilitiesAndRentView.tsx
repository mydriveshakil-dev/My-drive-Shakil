import React, { useState } from 'react';
import { Group, UtilityBill, RentContribution } from '../types';
import { Zap, Home as HomeIcon, Plus, CheckCircle2, Clock, Edit2, AlertCircle, DollarSign, Calculator } from 'lucide-react';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { GlassContainer } from './GlassContainer';
import { evaluateMathExpression } from '../utils/mathEvaluator';

interface UtilitiesAndRentViewProps {
  group: Group;
  utilities: UtilityBill[];
  rent: RentContribution;
  onUpdateUtilityStatus: (id: string, status: 'paid' | 'pending') => void;
  onUpdateRentStatus: (status: 'paid' | 'pending') => void;
  onAddUtility: (utility: Omit<UtilityBill, 'id'>) => void;
  preferredCurrency?: string;
  customRates?: Record<string, number>;
}

export const UtilitiesAndRentView: React.FC<UtilitiesAndRentViewProps> = ({
  group,
  utilities,
  rent,
  onUpdateUtilityStatus,
  onUpdateRentStatus,
  onAddUtility,
  preferredCurrency = 'USD',
  customRates,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUtilName, setNewUtilName] = useState('');
  const [newUtilAmount, setNewUtilAmount] = useState('');
  const [newUtilPayer, setNewUtilPayer] = useState(group.members[0]?.id || 'm1');
  const [newUtilCategory, setNewUtilCategory] = useState<'electricity' | 'internet' | 'water' | 'gas' | 'cleaner' | 'other'>('electricity');

  const totalUtilities = utilities.reduce((sum, u) => sum + u.amount, 0);
  const perMemberUtil = totalUtilities / (group.members.length || 1);
  const perMemberRent = rent.totalRent / (group.members.length || 1);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUtilName.trim() || !newUtilAmount) return;

    const res = evaluateMathExpression(newUtilAmount);
    const parsed = res.calculatedValue ?? parseFloat(newUtilAmount);
    if (!parsed || parsed <= 0) return;

    onAddUtility({
      groupId: group.id,
      name: newUtilName.trim(),
      category: newUtilCategory,
      amount: parsed,
      dueDate: new Date().toISOString().split('T')[0],
      paidById: newUtilPayer,
      status: 'paid',
      cycle: group.cycleId,
    });

    setNewUtilName('');
    setNewUtilAmount('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header Banner */}
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border border-white/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <span className="text-xs font-black text-emerald-200 uppercase tracking-wider bg-white/15 px-3.5 py-1 rounded-full border border-white/20 backdrop-blur-md">
            Monthly Room Recurring Bills
          </span>
          <h2 className="text-2xl font-black mt-2 text-white drop-shadow-sm">Utilities & Rent Overview</h2>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            Track DEWA Electricity, WiFi Internet, LPG Gas & Landlord Rent per member
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 border border-white/30 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Utility Bill</span>
        </button>
      </GlassContainer>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-amber-200 uppercase tracking-wider">
              Total Utility Bills
            </span>
            <span className="w-10 h-10 rounded-2xl bg-amber-500/20 text-[#F9A826] flex items-center justify-center font-bold border border-amber-400/30">
              <Zap className="w-5 h-5" />
            </span>
          </div>
          <div>
            <DualCurrencyDisplay
              amount={totalUtilities}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="pill"
              baseClassName="text-3xl font-black text-white"
            />
          </div>
          <p className="text-xs text-amber-100/90 font-bold mt-2 flex items-baseline gap-1">
            <span>Share per member:</span>
            <DualCurrencyDisplay
              amount={perMemberUtil}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="inline"
              baseClassName="font-black text-[#F9A826]"
            />
          </p>
        </GlassContainer>

        <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-blue-200 uppercase tracking-wider">
              Room Landlord Rent
            </span>
            <span className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold border border-blue-400/30">
              <HomeIcon className="w-5 h-5" />
            </span>
          </div>
          <div>
            <DualCurrencyDisplay
              amount={rent.totalRent}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="pill"
              baseClassName="text-3xl font-black text-white"
            />
          </div>
          <p className="text-xs text-blue-100/90 font-bold mt-2 flex items-baseline gap-1">
            <span>Share per member:</span>
            <DualCurrencyDisplay
              amount={perMemberRent}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="inline"
              baseClassName="font-bold text-[#F9A826]"
            />
          </p>
        </GlassContainer>
      </div>

      {/* SECTION 1: Utility Bills List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#F9A826]" />
            Active Utility Bills ({utilities.length})
          </h3>
          <span className="text-xs text-emerald-200/80">Split equally among {group.members.length} members</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {utilities.map((util) => {
            const payer = group.members.find((m) => m.id === util.paidById);
            const isPaid = util.status === 'paid';

            return (
              <div
                key={util.id}
                className="bg-white/10 backdrop-blur-2xl border border-white/30 rounded-3xl p-4 shadow-xl hover:border-white/50 transition-all flex flex-col justify-between text-white"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{util.name}</h4>
                      <p className="text-xs text-emerald-100/80 mt-0.5">
                        Due: {util.dueDate} • Paid by{' '}
                        <strong className="text-white">{payer?.name || util.paidById}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => onUpdateUtilityStatus(util.id, isPaid ? 'pending' : 'paid')}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        isPaid
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-400/40 hover:bg-emerald-900/80'
                          : 'bg-amber-950/70 text-amber-300 border-amber-400/40 hover:bg-amber-900/80'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{isPaid ? 'Paid' : 'Pending'}</span>
                    </button>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3 border border-white/20 flex items-center justify-between mt-3">
                    <span className="text-xs font-semibold text-emerald-100/80">Total Bill Amount</span>
                    <span className="text-lg font-black text-white">{util.amount.toFixed(2)} AED</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100/80">
                  <span>Each member pays:</span>
                  <span className="font-bold text-[#F9A826]">
                    {(util.amount / (group.members.length || 1)).toFixed(2)} AED
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Room Rent Contribution Card */}
      <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold border border-blue-400/30">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Landlord Monthly Rent</h3>
              <p className="text-xs text-emerald-100/80">
                Main Landlord Payment by:{' '}
                <strong className="text-white">
                  {group.members.find((m) => m.id === rent.paidById)?.name || rent.paidById}
                </strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => onUpdateRentStatus(rent.status === 'paid' ? 'pending' : 'paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              rent.status === 'paid'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-400/40'
                : 'bg-amber-950/70 text-amber-300 border-amber-400/40'
            }`}
          >
            {rent.status === 'paid' ? 'Rent Paid to Landlord' : 'Rent Pending'}
          </button>
        </div>

        {/* Member rent status list */}
        <div>
          <h4 className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-2">
            Per-Member Rent Contribution ({perMemberRent.toFixed(2)} AED / person)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {group.members.map((member) => {
              const hasPaid = rent.paidMemberIds.includes(member.id);
              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold backdrop-blur-xl ${
                    hasPaid
                      ? 'bg-emerald-950/40 border-emerald-400/40 text-white'
                      : 'bg-amber-950/40 border-amber-400/40 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#F9A826] text-[#0B4A3F] flex items-center justify-center text-[10px] font-black">
                      {member.avatar}
                    </span>
                    <span>{member.name}</span>
                  </div>

                  <span className={`font-bold ${hasPaid ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {hasPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </GlassContainer>

      {/* Add Utility Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <GlassContainer variant="modal" className="w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/40 space-y-4">
            <h3 className="text-lg font-black text-white">Add Utility Bill</h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-200 uppercase mb-1">
                  Bill Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Water & Sewerage or Cleaning"
                  value={newUtilName}
                  onChange={(e) => setNewUtilName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/25 rounded-xl text-sm font-semibold text-white placeholder-white/40 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-200 uppercase mb-1">
                  Amount ({group.currency})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  placeholder="0.00 (e.g. 10+20+30)"
                  value={newUtilAmount}
                  onChange={(e) => setNewUtilAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const res = evaluateMathExpression(newUtilAmount);
                      if (res.isValid && res.calculatedValue !== null && res.hasOperator) {
                        e.preventDefault();
                        setNewUtilAmount(res.displayValue);
                      }
                    }
                  }}
                  onBlur={() => {
                    const res = evaluateMathExpression(newUtilAmount);
                    if (res.isValid && res.calculatedValue !== null && res.hasOperator) {
                      setNewUtilAmount(res.displayValue);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/25 rounded-xl text-sm font-semibold text-white placeholder-white/40 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />

                {/* Quick Math Symbols Strip */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] font-bold text-emerald-200/80 uppercase shrink-0 mr-0.5 flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-[#F9A826]" />
                    Math:
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewUtilAmount((prev) => prev + '+')}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-xs rounded-lg border border-white/25 cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUtilAmount((prev) => prev + '-')}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-xs rounded-lg border border-white/25 cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUtilAmount((prev) => prev + '*')}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-xs rounded-lg border border-white/25 cursor-pointer"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUtilAmount((prev) => prev + '/')}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-xs rounded-lg border border-white/25 cursor-pointer"
                  >
                    ÷
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = evaluateMathExpression(newUtilAmount);
                      if (res.isValid && res.calculatedValue !== null) {
                        setNewUtilAmount(res.displayValue);
                      }
                    }}
                    className="px-2.5 py-1 bg-[#F9A826] hover:bg-[#e59819] active:scale-95 text-[#0B4A3F] font-black text-xs rounded-lg shadow-sm cursor-pointer ml-auto"
                  >
                    =
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-200 uppercase mb-1">
                  Paid By
                </label>
                <select
                  value={newUtilPayer}
                  onChange={(e) => setNewUtilPayer(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900/90 border border-white/25 rounded-xl text-sm font-semibold text-white focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer"
                >
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-3 rounded-xl border border-white/20 text-xs font-bold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] text-xs font-black shadow-lg shadow-amber-500/20"
                >
                  Save Utility
                </button>
              </div>
            </form>
          </GlassContainer>
        </div>
      )}
    </div>
  );
};
