import React, { useState, useEffect } from 'react';
import { Group, UtilityBill, RentContribution, UserAuthProfile } from '../types';
import { Zap, Home as HomeIcon, Plus, CheckCircle2, Clock, Edit2, AlertCircle, DollarSign, Calculator, Trash2, Lock, Unlock, X } from 'lucide-react';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { GlassContainer } from './GlassContainer';
import { evaluateMathExpression } from '../utils/mathEvaluator';
import { isCategoryPermittedForUser } from '../utils/permissionUtils';

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

  const hasRentPermission = isCategoryPermittedForUser('rent', group, currentUser);
  const hasUtilityPermission =
    isCategoryPermittedForUser('electricity', group, currentUser) ||
    isCategoryPermittedForUser('internet', group, currentUser) ||
    isCategoryPermittedForUser('water', group, currentUser) ||
    isCategoryPermittedForUser('gas', group, currentUser) ||
    isCategoryPermittedForUser('cleaner', group, currentUser);

  const visibleUtilities = utilities.filter((u) => isCategoryPermittedForUser(u.category, group, currentUser));

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUtilName, setNewUtilName] = useState('');
  const [newUtilAmount, setNewUtilAmount] = useState('');
  const [newUtilPayer, setNewUtilPayer] = useState(loggedInMember?.id || 'm1');
  const [newUtilCategory, setNewUtilCategory] = useState<'electricity' | 'internet' | 'water' | 'gas' | 'cleaner' | 'other'>('electricity');

  useEffect(() => {
    if (showAddModal && loggedInMember) {
      setNewUtilPayer(loggedInMember.id);
    }
  }, [showAddModal, loggedInMember?.id]);

  const now = new Date();
  const currentMonthCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [totalRentInput, setTotalRentInput] = useState((rent?.totalRent || 0).toString());
  const [paidRentMembers, setPaidRentMembers] = useState<string[]>(rent?.paidMemberIds || []);

  const paidMemberIdsJoined = (rent?.paidMemberIds || []).join(',');

  useEffect(() => {
    if (rent) {
      // Auto-reset on the 1st of next month if cycle has passed
      if (rent.cycle && rent.cycle < currentMonthCycle) {
        const resetRent: RentContribution = {
          ...rent,
          totalRent: 0,
          paidMemberIds: [],
          cycle: currentMonthCycle,
          perMemberAmount: 0,
          status: 'pending',
        };
        setTotalRentInput('0');
        setPaidRentMembers([]);
        if (onUpdateRent) {
          onUpdateRent(resetRent);
        }
      } else {
        setTotalRentInput((rent.totalRent || 0).toString());
        setPaidRentMembers(rent.paidMemberIds || []);
      }
    }
  }, [rent?.totalRent, paidMemberIdsJoined, rent?.cycle, currentMonthCycle]);

  const isAdmin = currentUser?.role === 'admin';
  const isRentAmountSet = (rent?.totalRent || 0) > 0;
  const isRentInputLocked = rent?.isLocked ?? false;

  const handleLockRent = () => {
    const parsed = parseFloat(totalRentInput) || 0;
    if (parsed <= 0) {
      alert('Please enter a valid rent amount before locking.');
      return;
    }
    const updatedRent: RentContribution = {
      ...rent,
      totalRent: parsed,
      perMemberAmount: parsed / totalRentSplitCount,
      cycle: rent.cycle || currentMonthCycle,
      isLocked: true,
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    }
  };

  const handleUnlockRent = () => {
    if (!isAdmin && rent?.isLocked) {
      alert('Only Admin can unlock the rent amount.');
      return;
    }
    const updatedRent: RentContribution = {
      ...rent,
      isLocked: false,
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    }
  };

  const rentParticipatingMembers = group.members.filter(
    (m) => !m.includedCategories || m.includedCategories.length === 0 || m.includedCategories.includes('rent')
  );
  const rentParticipatingCount = rentParticipatingMembers.length || 1;

  const tempMembers = rent?.temporaryMembers || [];
  const tempMembersCount = tempMembers.length;
  const totalRentSplitCount = rentParticipatingCount + tempMembersCount;

  const totalUtilities = utilities.reduce((sum, u) => sum + u.amount, 0);
  const activeMembersCount = group.members.filter((m) => m.active !== false).length || 1;
  const perMemberUtil = totalUtilities / activeMembersCount;
  const perMemberRent = (rent?.totalRent || 0) / totalRentSplitCount;

  const parsedTotalRent = parseFloat(totalRentInput) || rent?.totalRent || 0;
  const currentMemberRentShare = parsedTotalRent / totalRentSplitCount;

  const [newTempName, setNewTempName] = useState('');
  const [showAddTempInput, setShowAddTempInput] = useState(false);

  const handleAddTempMember = () => {
    if (!newTempName.trim()) return;
    const updatedTemp = [...tempMembers, newTempName.trim()];
    const updatedRent: RentContribution = {
      ...rent,
      temporaryMembers: updatedTemp,
      perMemberAmount: (rent?.totalRent || 0) / (rentParticipatingCount + updatedTemp.length),
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    }
    setNewTempName('');
    setShowAddTempInput(false);
  };

  const handleRemoveTempMember = (indexToRemove: number) => {
    const updatedTemp = tempMembers.filter((_, idx) => idx !== indexToRemove);
    const updatedRent: RentContribution = {
      ...rent,
      temporaryMembers: updatedTemp,
      perMemberAmount: (rent?.totalRent || 0) / (rentParticipatingCount + updatedTemp.length),
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    }
  };

  const handleRentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isRentInputLocked) return;
    const val = e.target.value;
    setTotalRentInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const updatedRent: RentContribution = {
        ...rent,
        totalRent: parsed,
        perMemberAmount: parsed / totalRentSplitCount,
        cycle: rent.cycle || currentMonthCycle,
      };
      if (onUpdateRent) {
        onUpdateRent(updatedRent);
      }
    }
  };

  const toggleMemberRentPaid = (memberId: string) => {
    const isCurrentlyPaid = paidRentMembers.includes(memberId);
    
    // Member cannot untick once marked as paid for the month unless Admin
    if (isCurrentlyPaid && !isAdmin) {
      alert('This rent payment status is locked for the current month once marked as paid. It will automatically unlock & reset on the 1st day of next month (or contact Admin).');
      return;
    }

    let updated: string[];
    if (isCurrentlyPaid) {
      updated = paidRentMembers.filter((id) => id !== memberId);
    } else {
      updated = [...paidRentMembers, memberId];
    }
    setPaidRentMembers(updated);
    if (onUpdateRent) {
      onUpdateRent({
        ...rent,
        paidMemberIds: updated,
        cycle: rent.cycle || currentMonthCycle,
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
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  Total Rent Amount (AED)
                </label>
                {isRentInputLocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-0.5 rounded-full shadow-xs">
                    <Lock className="w-3 h-3 text-amber-800" />
                    Locked for {rent.cycle || currentMonthCycle}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-black/30 px-2 py-0.5 rounded-full">
                    Type amount and click LOCK
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-36 sm:w-44">
                  <input
                    type="number"
                    value={totalRentInput}
                    onChange={handleRentInputChange}
                    disabled={isRentInputLocked}
                    placeholder="e.g. 3500"
                    className={`w-full bg-white border border-black rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-black ${
                      isRentInputLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed opacity-80' : ''
                    }`}
                  />
                </div>

                {isRentInputLocked ? (
                  <button
                    type="button"
                    onClick={handleUnlockRent}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black font-extrabold text-xs transition-all shadow-xs ${
                      isAdmin
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-500 cursor-pointer'
                        : 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed'
                    }`}
                    title={isAdmin ? 'Click to Unlock Rent' : 'Locked for current month'}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-800" />
                    <span>LOCKED</span>
                    {isAdmin && <span className="text-[10px] text-amber-900 underline font-bold ml-0.5">(Unlock)</span>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLockRent}
                    className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-slate-800 text-white rounded-xl border border-black font-extrabold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>LOCK</span>
                  </button>
                )}
              </div>
              {isRentInputLocked && (
                <p className="text-[11px] font-semibold text-amber-800 mt-1">
                  * Rent modification is locked for the current month. It will automatically reset on the 1st of next month.
                </p>
              )}
            </div>

            <div className="bg-white p-3 rounded-xl border border-black text-right shadow-xs">
              <span className="text-[10px] font-bold text-slate-700 uppercase block">
                Calculated Per-Member Share
              </span>
              <span className="text-lg font-black text-slate-950">
                {currentMemberRentShare.toFixed(2)} AED
              </span>
              <span className="text-[10px] text-slate-600 block">
                Split equally among {totalRentSplitCount} person(s) ({rentParticipatingCount} members {tempMembersCount > 0 ? `+ ${tempMembersCount} temp splitters` : ''})
              </span>
            </div>
          </div>
        </div>

        {/* Temporary Rent Splitters Section (Admin Only & Public View) */}
        <div className="bg-slate-100 p-3.5 rounded-2xl border border-black/30 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>Temporary Rent Splitters</span>
                <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                  Rent Module Only
                </span>
              </h4>
              <p className="text-[11px] text-slate-600">
                Text-based names strictly for splitting rent (No database accounts created).
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddTempInput(!showAddTempInput)}
                className="px-2.5 py-1 bg-black text-white rounded-xl text-xs font-bold border border-black hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Temporary Member</span>
              </button>
            )}
          </div>

          {/* Inline Add Temporary Member Input Form */}
          {isAdmin && showAddTempInput && (
            <div className="p-2.5 bg-white rounded-xl border border-black flex items-center gap-2 animate-in fade-in">
              <input
                type="text"
                placeholder="e.g. Guest Roommate (Rahat)"
                value={newTempName}
                onChange={(e) => setNewTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTempMember();
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-black rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button
                type="button"
                onClick={handleAddTempMember}
                className="px-3 py-1.5 bg-black text-white text-xs font-black rounded-lg border border-black hover:bg-slate-800 cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTempName('');
                  setShowAddTempInput(false);
                }}
                className="px-2.5 py-1.5 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-400 hover:bg-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* List of active temporary members */}
          {tempMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {tempMembers.map((name, idx) => (
                <div
                  key={`temp-${idx}`}
                  className="bg-white border border-black px-3 py-1 rounded-xl text-xs font-black text-slate-900 flex items-center gap-2 shadow-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span>{name} (Temp)</span>
                  <span className="text-[10px] text-slate-500 font-normal">({currentMemberRentShare.toFixed(0)} AED)</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTempMember(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 ml-1 cursor-pointer"
                      title="Remove temporary rent splitter"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No temporary rent splitters added for this cycle.</p>
          )}
        </div>

        {/* Member rent status list with checkboxes */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Member Rent Payment Status ({currentMemberRentShare.toFixed(2)} AED / person)
            </h4>
            <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full border border-black/20">
              1-Time Lock per month • Auto-resets on 1st of next month
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {group.members.map((member) => {
              const isPaid = paidRentMembers.includes(member.id);
              const isUntickDisabled = isPaid && !isAdmin;

              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all ${
                    isPaid
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-white text-slate-900 border-black'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      disabled={isUntickDisabled}
                      onChange={() => toggleMemberRentPaid(member.id)}
                      className={`w-4 h-4 rounded text-black focus:ring-black accent-black ${
                        isUntickDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                      }`}
                      title={
                        isUntickDisabled
                          ? 'Payment status locked for current month. Resets on 1st of next month.'
                          : 'Click to mark rent paid'
                      }
                    />
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isPaid ? 'bg-white text-black' : 'bg-black text-white'
                      }`}
                    >
                      {member.avatar}
                    </span>
                    <span className="truncate max-w-[90px]">{member.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono">
                      {currentMemberRentShare.toFixed(0)} AED
                    </span>
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      {isPaid ? (
                        <>
                          <span className="text-emerald-400">Paid</span>
                          {isUntickDisabled ? (
                            <span title="Locked for current month">🔒</span>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </>
                      ) : (
                        'Pending'
                      )}
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
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={() => setNewUtilAmount((prev) => prev + '+')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-xs rounded-lg border border-black cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={() => setNewUtilAmount((prev) => prev + '-')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-xs rounded-lg border border-black cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={() => setNewUtilAmount((prev) => prev + '*')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-xs rounded-lg border border-black cursor-pointer"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onClick={() => setNewUtilAmount((prev) => prev + '/')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-xs rounded-lg border border-black cursor-pointer"
                  >
                    ÷
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
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
