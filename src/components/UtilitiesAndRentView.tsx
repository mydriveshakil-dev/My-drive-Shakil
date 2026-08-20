import React, { useState, useEffect } from 'react';
import { Group, UtilityBill, RentContribution, UserAuthProfile } from '../types';
import { Zap, Home as HomeIcon, Plus, CheckCircle2, Clock, Edit2, AlertCircle, DollarSign, Calculator, Trash2, Lock, Unlock, X, Users, CheckSquare, Square } from 'lucide-react';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { GlassContainer } from './GlassContainer';
import { MemberAvatar } from './MemberAvatar';
import { evaluateMathExpression } from '../utils/mathEvaluator';
import { isCategoryPermittedForUser } from '../utils/permissionUtils';
import { isPhoneMatch } from '../lib/firebase';

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

const UTILITY_NAME_OPTIONS = [
  'LPG Gass',
  'Drinking Water',
  'WiFi',
  'Cigarettes',
  'AC Repair',
  'Room Maintenance',
  'Washroom Maintenance.',
  'Kitchen Maintenance',
  'Others',
];

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
      (currentUser?.mobileNumber &&
        (isPhoneMatch(m.phone, currentUser.mobileNumber) ||
          isPhoneMatch(m.mobileNumber, currentUser.mobileNumber))) ||
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

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUtilNameOption, setNewUtilNameOption] = useState(UTILITY_NAME_OPTIONS[0]);
  const [customUtilName, setCustomUtilName] = useState('');
  const [newUtilAmount, setNewUtilAmount] = useState('');
  const [newUtilPayer, setNewUtilPayer] = useState(loggedInMember?.id || 'm1');
  const [newUtilCategory, setNewUtilCategory] = useState<'electricity' | 'internet' | 'water' | 'gas' | 'cleaner' | 'other'>('gas');
  const [newUtilSharedWith, setNewUtilSharedWith] = useState<string[]>([]);

  // Initialize sharedWith default to all group members
  useEffect(() => {
    if (group.members) {
      setNewUtilSharedWith(group.members.map((m) => m.id));
    }
  }, [group.members]);

  useEffect(() => {
    if (loggedInMember) {
      setNewUtilPayer(loggedInMember.id);
    }
  }, [loggedInMember?.id]);

  const now = new Date();
  const currentMonthCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [totalRentInput, setTotalRentInput] = useState((rent?.totalRent || 0).toString());
  const [paidRentMembers, setPaidRentMembers] = useState<string[]>(rent?.paidMemberIds || []);

  const paidMemberIdsJoined = (rent?.paidMemberIds || []).join(',');

  useEffect(() => {
    if (rent) {
      // Auto-reset on the 1st of next month if cycle has passed or month changed
      const rentCycleToCheck = rent.paidCycle || rent.cycle;
      if (rentCycleToCheck && rentCycleToCheck < currentMonthCycle) {
        const resetRent: RentContribution = {
          ...rent,
          totalRent: 0,
          paidMemberIds: [],
          cycle: currentMonthCycle,
          paidCycle: undefined,
          paidAt: undefined,
          perMemberAmount: 0,
          status: 'pending',
          isLocked: false,
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
  }, [rent?.totalRent, paidMemberIdsJoined, rent?.cycle, rent?.paidCycle, currentMonthCycle]);

  const isAdmin = currentUser?.role === 'admin';
  const isRentAmountSet = (rent?.totalRent || 0) > 0;
  const isRentInputLocked = rent?.isLocked ?? false;

  const isRentPaidToLandlord = rent?.status === 'paid';
  const isRentPaidLocked =
    isRentPaidToLandlord &&
    (rent?.paidCycle === currentMonthCycle || (!rent?.paidCycle && rent?.cycle === currentMonthCycle));

  const handleToggleRentToLandlord = () => {
    if (isRentPaidLocked) {
      if (!isAdmin) {
        alert(
          `Rent payment to landlord is locked for the current month (${currentMonthCycle}). It will automatically unlock on the 1st of next month.`
        );
        return;
      }
      const confirmReset = window.confirm(
        `You are Admin. Do you want to unlock & reset Rent to Landlord status for ${currentMonthCycle} back to Pending?`
      );
      if (confirmReset) {
        const updatedRent: RentContribution = {
          ...rent,
          status: 'pending',
          paidCycle: undefined,
          paidAt: undefined,
        };
        if (onUpdateRent) {
          onUpdateRent(updatedRent);
        } else {
          onUpdateRentStatus('pending');
        }
      }
      return;
    }

    // Mark as paid and lock for current month
    const updatedRent: RentContribution = {
      ...rent,
      status: 'paid',
      paidCycle: currentMonthCycle,
      paidAt: new Date().toISOString(),
      cycle: rent.cycle || currentMonthCycle,
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    } else {
      onUpdateRentStatus('paid');
    }
  };

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
    } else if (val === '') {
      const updatedRent: RentContribution = {
        ...rent,
        totalRent: 0,
        perMemberAmount: 0,
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
    const finalName = newUtilNameOption === 'Others' ? (customUtilName.trim() || 'Others') : newUtilNameOption;
    if (!finalName || !newUtilAmount) return;

    const res = evaluateMathExpression(newUtilAmount);
    const parsed = res.calculatedValue ?? parseFloat(newUtilAmount);
    if (!parsed || parsed <= 0) return;

    onAddUtility({
      groupId: group.id,
      name: finalName,
      category: newUtilCategory,
      amount: parsed,
      dueDate: new Date().toISOString().split('T')[0],
      paidById: newUtilPayer,
      status: 'paid',
      cycle: group.cycleId,
      sharedWithIds: newUtilSharedWith.length > 0 ? newUtilSharedWith : group.members.map((m) => m.id),
    });

    setNewUtilNameOption(UTILITY_NAME_OPTIONS[0]);
    setCustomUtilName('');
    setNewUtilAmount('');
    setNewUtilSharedWith(group.members.map((m) => m.id));
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header Banner - Dark Navy Luxury Theme matching Dashboard */}
      <div
        className="rounded-3xl neu-upper text-slate-900 overflow-hidden"
      >
        {/* Top Dark Navy Header Band with centered Title & Description */}
        <div className="bg-[#07193F] text-white px-5 py-5 sm:py-6 text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white">Utilities & Rent Overview</h2>
          <p className="text-xs text-blue-200 font-medium mt-1">
            Track DEWA Electricity, WiFi Internet, LPG Gas & Landlord Rent per member
          </p>
        </div>

        {/* Center-aligned Add Utility Bill Button */}
        <div className="p-5 sm:p-6 flex justify-center items-center">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-black px-6 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer uppercase tracking-wider shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{showAddForm ? 'Close Add Bill' : '+ Add Utility Bill'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards - Compact Side-by-Side Boxes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 neu-upper text-slate-900 rounded-2xl">
          <div className="flex items-center justify-between text-slate-800 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              Utilities
            </span>
          </div>
          <span className="text-[11px] text-slate-600 font-semibold block truncate">Total Utility Bills</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={totalUtilities}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="pill"
              baseClassName="text-lg sm:text-xl font-black text-slate-950"
            />
          </div>
          <p className="text-[10px] text-slate-600 font-bold mt-1 flex items-baseline gap-1 truncate">
            <span>Per member:</span>
            <DualCurrencyDisplay
              amount={perMemberUtil}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="inline"
              baseClassName="font-black text-slate-950"
            />
          </p>
        </div>

        <div className="p-4 neu-upper text-slate-900 rounded-2xl">
          <div className="flex items-center justify-between text-slate-800 mb-1">
            <HomeIcon className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
              Rent
            </span>
          </div>
          <span className="text-[11px] text-slate-600 font-semibold block truncate">Total Room Rent</span>
          <div className="mt-1">
            <DualCurrencyDisplay
              amount={rent.totalRent}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="pill"
              baseClassName="text-lg sm:text-xl font-black text-slate-950"
            />
          </div>
          <p className="text-[10px] text-slate-600 font-bold mt-1 flex items-baseline gap-1 truncate">
            <span>Per member:</span>
            <DualCurrencyDisplay
              amount={perMemberRent}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="inline"
              baseClassName="font-black text-slate-950"
            />
          </p>
        </div>
      </div>

      {/* INLINE ADD UTILITY BILL FORM SECTION (Renders directly on main page) */}
      {showAddForm && (
        <div className="p-5 sm:p-6 rounded-3xl neu-upper text-slate-900 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-300/60 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 stroke-[2.5]" />
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Add Utility Bill Entry
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-900 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            {/* Bill Name Selection Box */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Bill Name / Category
              </label>
              <select
                value={newUtilNameOption}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewUtilNameOption(val);
                  if (val === 'WiFi') setNewUtilCategory('internet');
                  else if (val === 'LPG Gass') setNewUtilCategory('gas');
                  else if (val === 'Drinking Water') setNewUtilCategory('water');
                  else setNewUtilCategory('other');
                }}
                className="w-full px-4 py-2.5 neu-lower-sm rounded-xl text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {UTILITY_NAME_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {/* Custom name input if "Others" selected */}
              {newUtilNameOption === 'Others' && (
                <input
                  type="text"
                  required
                  placeholder="Enter custom bill name..."
                  value={customUtilName}
                  onChange={(e) => setCustomUtilName(e.target.value)}
                  className="mt-2 w-full px-4 py-2.5 neu-lower-sm rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              )}
            </div>

            {/* Bill Amount */}
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
                className="w-full px-4 py-2.5 neu-lower-sm rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
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
                  className="px-2.5 py-1 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs rounded-lg cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => setNewUtilAmount((prev) => prev + '-')}
                  className="px-2.5 py-1 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs rounded-lg cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => setNewUtilAmount((prev) => prev + '*')}
                  className="px-2.5 py-1 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs rounded-lg cursor-pointer"
                >
                  ×
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => setNewUtilAmount((prev) => prev + '/')}
                  className="px-2.5 py-1 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs rounded-lg cursor-pointer"
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

            {/* Paid By Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  Paid By
                </label>
                {isAdmin ? (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Admin Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                    Locked
                  </span>
                )}
              </div>
              <select
                value={newUtilPayer}
                onChange={(e) => setNewUtilPayer(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-4 py-2.5 neu-lower-sm rounded-xl text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isAdmin ? (
                  group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone || m.mobileNumber || m.email || 'Member'})
                    </option>
                  ))
                ) : loggedInMember ? (
                  <option value={loggedInMember.id}>
                    {loggedInMember.name} (Your Account)
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

            {/* Shared With Option (Multi-Select Member Checkboxes) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  Shared With ({newUtilSharedWith.length} of {group.members.length} members)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (newUtilSharedWith.length === group.members.length) {
                      setNewUtilSharedWith([]);
                    } else {
                      setNewUtilSharedWith(group.members.map((m) => m.id));
                    }
                  }}
                  className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  {newUtilSharedWith.length === group.members.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 neu-lower-sm p-3 rounded-2xl max-h-48 overflow-y-auto">
                {group.members.map((m) => {
                  const isSelected = newUtilSharedWith.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'neu-upper-sm text-emerald-950 font-bold'
                          : 'bg-transparent text-slate-400 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setNewUtilSharedWith(newUtilSharedWith.filter((id) => id !== m.id));
                          } else {
                            setNewUtilSharedWith([...newUtilSharedWith, m.id]);
                          }
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                      />
                      <MemberAvatar
                        name={m.name}
                        avatar={m.avatar}
                        size="xs"
                        className="w-5 h-5 text-[9px] shrink-0"
                      />
                      <span className="truncate">{m.name}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                * Selected members will share this bill amount equally. Unselected members are excluded.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="w-1/2 py-3 rounded-xl neu-upper-btn text-xs font-bold text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-[24px] bg-black hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider"
              >
                Save Utility Bill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 1: Utility Bills List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-900" />
            Active Utility Bills ({utilities.length})
          </h3>
          <span className="text-xs text-slate-600">Tracked & split per member inclusion</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {utilities.map((util) => {
            const payer = group.members.find((m) => m.id === util.paidById);
            const isPaid = util.status === 'paid';
            const isAdmin = currentUser?.role === 'admin';
            const isPayer = loggedInMember?.id === util.paidById;
            const canToggle = isAdmin || isPayer;
            const canDelete = isAdmin || isPayer;

            const sharedWithIds = util.sharedWithIds && util.sharedWithIds.length > 0
              ? util.sharedWithIds
              : group.members.map((m) => m.id);
            const sharedMembers = group.members.filter((m) => sharedWithIds.includes(m.id));
            const perMemberUtilCost = util.amount / (sharedWithIds.length || 1);

            return (
              <div
                key={util.id}
                className="neu-upper rounded-3xl p-4 transition-all flex flex-col justify-between text-slate-900"
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
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${
                        isPaid
                          ? 'bg-black text-white'
                          : 'neu-upper-sm text-slate-900'
                      } ${!canToggle ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{isPaid ? 'Paid' : 'Pending'}</span>
                    </button>
                  </div>

                  <div className="neu-lower-sm rounded-2xl p-3 flex items-center justify-between mt-3">
                    <span className="text-xs font-semibold text-slate-700">Total Bill Amount</span>
                    <span className="text-lg font-black text-slate-950">{util.amount.toFixed(2)} AED</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-300/60 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Shared cost per member ({sharedWithIds.length}):</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-950">
                        {perMemberUtilCost.toFixed(2)} AED
                      </span>
                      {onDeleteUtility && canDelete && (
                        <div>
                          {deleteConfirmUtilId === util.id ? (
                            <div className="flex items-center gap-1 p-1 rounded-xl neu-upper-sm shadow-md">
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
                                className="px-1.5 py-0.5 neu-upper-sm text-slate-900 font-bold text-[10px] rounded-lg cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUtilId(util.id)}
                              className="p-1 text-slate-900 neu-upper-sm rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold text-[10px]"
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

                  {/* Shared With Badge Pills */}
                  <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1 flex-wrap">
                    <span className="font-bold text-slate-800">Shared with:</span>
                    {sharedMembers.length === group.members.length ? (
                      <span className="neu-upper-sm text-slate-800 font-bold px-2 py-0.5 rounded">
                        All Members
                      </span>
                    ) : (
                      sharedMembers.map((m) => (
                        <span key={m.id} className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded">
                          {m.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Room Rent Contribution Card */}
      <div className="p-5 neu-upper text-slate-900 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-300/60 pb-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold shrink-0">
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

          <div className="flex flex-col sm:items-end gap-1.5">
            <button
              type="button"
              onClick={handleToggleRentToLandlord}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 ${
                isRentPaidLocked
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : isRentPaidToLandlord
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
              title={
                isRentPaidLocked
                  ? `Rent paid & locked for ${currentMonthCycle}. Automatically unlocks on 1st of next month.`
                  : 'Click to mark Rent as Paid to Landlord and lock for this month'
              }
            >
              {isRentPaidLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Rent Paid to Landlord</span>
                </>
              ) : isRentPaidToLandlord ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Rent Paid to Landlord</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Rent Pending (Click to Pay)</span>
                </>
              )}
            </button>

            {isRentPaidLocked ? (
              <span className="text-[10px] font-black text-emerald-900 bg-emerald-100/90 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 self-start sm:self-auto shadow-2xs">
                <Lock className="w-2.5 h-2.5" /> Locked for this month • Unlocks 1st next month
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 self-start sm:self-auto">
                Click once to pay & lock for current month
              </span>
            )}
          </div>
        </div>

        {/* Total Rent Input Field & Per-Member Share Calculation */}
        <div className="neu-lower-sm p-4 rounded-2xl space-y-3">
          {/* Top Row: Label, Lock/Unlock Button on right side of text & Status Badge */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                Total Rent Amount ({group.currency || 'AED'})
              </label>

              {/* Lock / Unlock Toggle Button placed on the right side of Total Rent Amount text */}
              {isRentInputLocked ? (
                <button
                  type="button"
                  onClick={handleUnlockRent}
                  disabled={!isAdmin}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 shrink-0 ${
                    isAdmin
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-500 cursor-pointer shadow-2xs active:scale-95'
                      : 'neu-lower-sm text-slate-500 cursor-not-allowed'
                  }`}
                  title={isAdmin ? 'Click to Unlock Rent' : 'Only Admin can unlock'}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isAdmin ? 'Unlock' : 'Locked'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLockRent}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  title="Lock Rent Amount for this Month"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>LOCK</span>
                </button>
              )}

              {isRentInputLocked ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full shadow-2xs">
                  Locked for {rent.cycle || currentMonthCycle}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full">
                  Type amount and click LOCK
                </span>
              )}
            </div>
          </div>

          {/* Bottom Row: Room rent amount box and Each member share box side-by-side in 1 line */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Box 1: Room rent amount box */}
            <div className="p-3 neu-upper-sm rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-600 font-extrabold uppercase block mb-1">
                Room Rent Amount
              </span>
              <div className="flex items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  value={totalRentInput}
                  onChange={handleRentInputChange}
                  disabled={isRentInputLocked}
                  placeholder="e.g. 3500"
                  className={`w-full neu-lower-sm rounded-lg px-2.5 py-1.5 text-sm sm:text-base font-black text-slate-900 focus:outline-none ${
                    isRentInputLocked ? 'text-slate-700 cursor-not-allowed opacity-90' : ''
                  }`}
                />
                <span className="ml-2 text-xs font-black text-slate-700 shrink-0">AED</span>
              </div>
            </div>

            {/* Box 2: Each member share box */}
            <div className="p-3 neu-upper-sm rounded-xl flex flex-col justify-between text-right">
              <span className="text-[10px] text-slate-600 font-extrabold uppercase block mb-1">
                Each Member Share
              </span>
              <span className="text-sm sm:text-base font-black text-slate-950 block">
                {currentMemberRentShare.toFixed(2)} AED
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                ({rentParticipatingCount} members {tempMembersCount > 0 ? `+ ${tempMembersCount} temp` : ''})
              </span>
            </div>
          </div>
        </div>

        {/* Temporary Member Box */}
        <div className="p-3 neu-lower-sm rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Temporary Member ({tempMembers.length})
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddTempInput(!showAddTempInput)}
                className="px-2.5 py-1 bg-black text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Temp. Member</span>
              </button>
            )}
          </div>

          {/* Inline Add Temporary Member Input Form */}
          {isAdmin && showAddTempInput && (
            <div className="p-2.5 neu-upper-sm rounded-xl flex items-center gap-2 animate-in fade-in">
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
                className="flex-1 px-3 py-1.5 neu-lower-sm rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTempMember}
                className="px-3 py-1.5 bg-black text-white text-xs font-black rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTempName('');
                  setShowAddTempInput(false);
                }}
                className="px-2.5 py-1.5 neu-upper-btn text-slate-800 text-xs font-bold rounded-lg cursor-pointer"
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
                  className="neu-upper-sm px-3 py-1 rounded-xl text-xs font-black text-slate-900 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span>{name} (Temp)</span>
                  <span className="text-[10px] text-slate-500 font-normal">({currentMemberRentShare.toFixed(0)} AED)</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTempMember(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 ml-1 cursor-pointer"
                      title="Remove temporary member"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No temporary members added for this cycle.</p>
          )}
        </div>

        {/* Member rent status list with checkboxes */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Member Rent Payment Status ({currentMemberRentShare.toFixed(2)} AED / person)
            </h4>
            <span className="text-[10px] text-slate-600 font-bold neu-upper-sm px-2.5 py-0.5 rounded-full">
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
                  className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold transition-all ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-950 neu-upper-sm'
                      : 'neu-upper-sm text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      disabled={isUntickDisabled}
                      onChange={() => toggleMemberRentPaid(member.id)}
                      className={`w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 ${
                        isUntickDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                      }`}
                      title={
                        isUntickDisabled
                          ? 'Payment status locked for current month. Resets on 1st of next month.'
                          : 'Click to mark rent paid'
                      }
                    />
                    <MemberAvatar
                      name={member.name}
                      avatar={member.avatar}
                      size="xs"
                      className="w-6 h-6 text-[10px] shrink-0"
                    />
                    <span className="truncate max-w-[90px]">{member.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono">
                      {currentMemberRentShare.toFixed(0)} AED
                    </span>
                    <span className="text-xs font-extrabold flex items-center gap-1">
                      {isPaid ? (
                        <>
                          <span className="text-emerald-700">Paid</span>
                          {isUntickDisabled ? (
                            <span title="Locked for current month">🔒</span>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
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
      </div>
    </div>
  );
};
