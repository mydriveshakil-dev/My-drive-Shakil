import React, { useState, useEffect } from 'react';
import { Group, UtilityBill, RentContribution, UserAuthProfile } from '../types';
import { Zap, Home as HomeIcon, Plus, CheckCircle2, Clock, Edit2, AlertCircle, DollarSign, Calculator, Trash2 } from 'lucide-react';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { GlassContainer } from './GlassContainer';
import { evaluateMathExpression } from '../utils/mathEvaluator';

interface UtilitiesAndRentViewProps {
  group: Group;
  utilities: UtilityBill[];
  rent: RentContribution;
  onUpdateUtilityStatus: (id: string, status: 'paid' | 'pending') => void;
  onUpdateRentStatus: (status: 'paid' | 'pending') => void;
  onUpdateRent?: (rent: RentContribution) => void;
  onAddUtility: (utility: Omit<UtilityBill, 'id'>) => void;
  onDeleteUtility?: (id: string) => void;
  preferredCurrency?: string;
  customRates?: Record<string, number>;
  currentUser?: UserAuthProfile | null;
}

export const UtilitiesAndRentView: React.FC<UtilitiesAndRentViewProps> = ({
  group,
  utilities,
  rent,
  onUpdateUtilityStatus,
  onUpdateRentStatus,
  onUpdateRent,
  onAddUtility,
  onDeleteUtility,
  preferredCurrency = 'USD',
  customRates,
  currentUser,
}) => {
  const [deleteConfirmUtilId, setDeleteConfirmUtilId] = useState<string | null>(null);
  const loggedInMember = group.members.find(
    (m) =>
      (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.mobileNumber && m.phone?.includes(currentUser.mobileNumber.slice(-7))) ||
      (currentUser?.name && m.name.toLowerCase() === currentUser.name.toLowerCase())
  ) || group.members[0];

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUtilName, setNewUtilName] = useState('');
  const [newUtilAmount, setNewUtilAmount] = useState('');
  const [newUtilPayer, setNewUtilPayer] = useState(loggedInMember?.id || 'm1');
  const [newUtilCategory, setNewUtilCategory] = useState<'electricity' | 'internet' | 'water' | 'gas' | 'cleaner' | 'other'>('electricity');

  useEffect(() => {
    if (showAddModal && loggedInMember) {
      setNewUtilPayer(loggedInMember.id);
    }
  }, [showAddModal, loggedInMember]);

  const [totalRentInput, setTotalRentInput] = useState((rent?.totalRent || 0).toString());
  const [paidRentMembers, setPaidRentMembers] = useState<string[]>(rent?.paidMemberIds || []);

  useEffect(() => {
    if (rent) {
      setTotalRentInput((rent.totalRent || 0).toString());
      setPaidRentMembers(rent.paidMemberIds || []);
    }
  }, [rent?.totalRent, rent?.paidMemberIds]);

  const rentParticipatingMembers = group.members.filter(
    (m) => !m.includedCategories || m.includedCategories.length === 0 || m.includedCategories.includes('rent')
  );
  const rentParticipatingCount = rentParticipatingMembers.length || 1;

  const totalUtilities = utilities.reduce((sum, u) => sum + u.amount, 0);
  const activeMembersCount = group.members.filter((m) => m.active !== false).length || 1;
  const perMemberUtil = totalUtilities / activeMembersCount;
  const perMemberRent = (rent?.totalRent || 0) / rentParticipatingCount;

  const parsedTotalRent = parseFloat(totalRentInput) || rent?.totalRent || 0;
  const currentMemberRentShare = parsedTotalRent / rentParticipatingCount;

  const handleRentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTotalRentInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const updatedRent: RentContribution = {
        ...rent,
        totalRent: parsed,
        perMemberAmount: parsed / rentParticipatingCount,
      };
      if (onUpdateRent) {
        onUpdateRent(updatedRent);
      }
    }
  };

  const toggleMemberRentPaid = (memberId: string) => {
    let updated: string[];
    if (paidRentMembers.includes(memberId)) {
      updated = paidRentMembers.filter((id) => id !== memberId);
    } else {
      updated = [...paidRentMembers, memberId];
    }
    setPaidRentMembers(updated);
    if (onUpdateRent) {
      onUpdateRent({
        ...rent,
        paidMemberIds: updated,
      });
    }
  };

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
        variant="card"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border-2 border-black shadow-xl bg-white text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <span className="text-xs font-black text-white uppercase tracking-wider bg-black px-3.5 py-1 rounded-full border border-black">
            Monthly Room Recurring Bills
          </span>
          <h2 className="text-2xl font-black mt-2 text-slate-950">Utilities & Rent Overview</h2>
          <p className="text-xs text-slate-700 font-medium mt-1">
            Track DEWA Electricity, WiFi Internet, LPG Gas & Landlord Rent per member
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-black hover:bg-slate-800 text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 border border-black self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Utility Bill</span>
        </button>
      </GlassContainer>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Total Utility Bills
            </span>
            <span className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold border border-black">
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
              baseClassName="text-3xl font-black text-slate-950"
            />
          </div>
          <p className="text-xs text-slate-700 font-bold mt-2 flex items-baseline gap-1">
            <span>Share per member:</span>
            <DualCurrencyDisplay
              amount={perMemberUtil}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="inline"
              baseClassName="font-black text-slate-950"
            />
          </p>
        </GlassContainer>

        <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Room Landlord Rent
            </span>
            <span className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold border border-black">
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
              baseClassName="text-3xl font-black text-slate-950"
            />
          </div>
          <p className="text-xs text-slate-700 font-bold mt-2 flex items-baseline gap-1">
            <span>Share per member:</span>
            <DualCurrencyDisplay
              amount={perMemberRent}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="inline"
              baseClassName="font-bold text-slate-950"
            />
          </p>
        </GlassContainer>
      </div>

      {/* SECTION 1: Utility Bills List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-900" />
            Active Utility Bills ({utilities.length})
          </h3>
          <span className="text-xs text-slate-600">Split equally among {group.members.length} members</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {utilities.map((util) => {
            const payer = group.members.find((m) => m.id === util.paidById);
            const isPaid = util.status === 'paid';
            const isAdmin = currentUser?.role === 'admin';
            const isPayer = loggedInMember?.id === util.paidById;
            const canToggle = isAdmin || isPayer;

            return (
              <div
                key={util.id}
                className="bg-white border border-black rounded-3xl p-4 shadow-md hover:border-black transition-all flex flex-col justify-between text-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{util.name}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Due: {util.dueDate} • Paid by{' '}
                        <strong className="text-slate-950">{payer?.name || util.paidById}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (canToggle) {
                          onUpdateUtilityStatus(util.id, isPaid ? 'pending' : 'paid');
                        }
                      }}
                      disabled={!canToggle}
                      title={!canToggle ? 'Only bill creator or App Admin can toggle bill status' : ''}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        isPaid
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-slate-900 border-black'
                      } ${!canToggle ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{isPaid ? 'Paid' : 'Pending'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 border border-black flex items-center justify-between mt-3">
                    <span className="text-xs font-semibold text-slate-700">Total Bill Amount</span>
                    <span className="text-lg font-black text-slate-950">{util.amount.toFixed(2)} AED</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-black/20 flex items-center justify-between text-xs text-slate-700">
                  <span>Each member pays:</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-950">
                      {(util.amount / (group.members.length || 1)).toFixed(2)} AED
                    </span>
                    {onDeleteUtility && (
                      <div>
                        {deleteConfirmUtilId === util.id ? (
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-black shadow-md">
                            <span className="text-[10px] text-slate-900 font-bold px-1">Delete?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteUtility(util.id);
                                setDeleteConfirmUtilId(null);
                              }}
                              className="px-2 py-0.5 bg-black text-white font-black text-[10px] rounded-lg cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUtilId(null)}
                              className="px-1.5 py-0.5 bg-white text-slate-900 border border-black font-bold text-[10px] rounded-lg cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUtilId(util.id)}
                            className="p-1 text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-all border border-black flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                            title="Delete utility bill"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-900" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Room Rent Contribution Card */}
      <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/20 pb-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold border border-black shrink-0">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Landlord Monthly Rent</h3>
              <p className="text-xs text-slate-600">
                Main Landlord Payment by:{' '}
                <strong className="text-slate-950">
                  {group.members.find((m) => m.id === rent.paidById)?.name || rent.paidById}
                </strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => onUpdateRentStatus(rent.status === 'paid' ? 'pending' : 'paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              rent.status === 'paid'
                ? 'bg-black text-white border-black'
                : 'bg-white text-slate-900 border-black hover:bg-slate-100'
            }`}
          >
            {rent.status === 'paid' ? 'Rent Paid to Landlord' : 'Rent Pending'}
          </button>
        </div>

        {/* Total Rent Input Field & Per-Member Share Calculation */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-black space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
                Total Rent Amount (AED)
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  value={totalRentInput}
                  onChange={handleRentInputChange}
                  placeholder="e.g. 3500"
                  className="w-full bg-white border border-black rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-black text-right shadow-xs">
              <span className="text-[10px] font-bold text-slate-700 uppercase block">
                Calculated Per-Member Share
              </span>
              <span className="text-lg font-black text-slate-950">
                {currentMemberRentShare.toFixed(2)} AED
              </span>
              <span className="text-[10px] text-slate-600 block">
                Split equally among {rentParticipatingCount} participating member(s)
              </span>
            </div>
          </div>
        </div>

        {/* Member rent status list with checkboxes */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Member Rent Payment Status ({currentMemberRentShare.toFixed(2)} AED / person)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {group.members.map((member) => {
              const isPaid = paidRentMembers.includes(member.id);
              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all ${
                    isPaid
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-slate-900 border-black'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={() => toggleMemberRentPaid(member.id)}
                      className="w-4 h-4 rounded text-black focus:ring-black cursor-pointer accent-black"
                    />
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isPaid ? 'bg-white text-black' : 'bg-black text-white'
                    }`}>
                      {member.avatar}
                    </span>
                    <span className="truncate max-w-[90px]">{member.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono">
                      {currentMemberRentShare.toFixed(0)} AED
                    </span>
                    <span className="text-xs font-extrabold">
                      {isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassContainer>

      {/* Add Utility Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <GlassContainer variant="card" className="w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 border-black bg-white text-slate-900 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add Utility Bill</h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Bill Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Water & Sewerage or Cleaning"
                  value={newUtilName}
                  onChange={(e) => setNewUtilName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-black rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
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
                  className="w-full px-4 py-2.5 bg-white border border-black rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-black focus:outline-none"
                />

                {/* Quick Math Symbols Strip */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-700 uppercase shrink-0 mr-0.5 flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-slate-900" />
                    Math:
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewUtilAmount((prev) => prev + '+')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-xs rounded-lg border border-black cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUtilAmount((prev) => prev + '-')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-xs rounded-lg border border-black cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUtilAmount((prev) => prev + '*')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-xs rounded-lg border border-black cursor-pointer"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUtilAmount((prev) => prev + '/')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-xs rounded-lg border border-black cursor-pointer"
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
                    className="px-2.5 py-1 bg-black hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-lg shadow-sm cursor-pointer ml-auto"
                  >
                    =
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Paid By
                </label>
                <select
                  value={newUtilPayer}
                  onChange={(e) => setNewUtilPayer(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-black rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-black focus:outline-none cursor-pointer"
                >
                  {loggedInMember ? (
                    <option value={loggedInMember.id}>
                      {loggedInMember.name} - Logged In User
                    </option>
                  ) : (
                    group.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-3 rounded-xl border border-black text-xs font-bold text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer"
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
