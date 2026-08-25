import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Group, Expense, UtilityBill, RentContribution, GoogleSheetsConfig, UserAuthProfile, BillingCycleType, PayToTransaction } from '../types';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { MemberAvatar } from './MemberAvatar';
import { cleanExpenseTitle } from '../utils/textCleaner';
import { getPreviousCycleOptions } from '../utils/cycleUtils';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { isPhoneMatch } from '../lib/firebase';
import { formatAmountNumber } from '../utils/currency';
import { formatDateDisplay } from '../utils/dateUtils';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AdminQuickControlsCard } from './AdminQuickControlsCard';
import {
  Calendar,
  Wallet,
  Users,
  RefreshCw,
  ExternalLink,
  Trash2,
  ChevronDown,
  Check,
  X as XIcon,
  Clock,
  HandCoins,
  CheckCircle2,
  Edit,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface DashboardViewProps {
  group: Group;
  allGroups?: Group[];
  expenses: Expense[];
  allExpenses?: Expense[];
  utilities: UtilityBill[];
  rent: RentContribution;
  sheetsConfig: GoogleSheetsConfig;
  onSyncNow: () => void;
  isSyncing: boolean;
  preferredCurrency?: string;
  customRates?: Record<string, number>;
  currentUser?: UserAuthProfile | null;
  onOpenCurrencySettings?: () => void;
  onOpenArchGuide?: () => void;
  onOpenLoginModal?: () => void;
  billingCycleType?: BillingCycleType;
  onToggleCycle?: (type: BillingCycleType) => void;
  selectedPreviousCycle?: string;
  onSelectPreviousCycle?: (cycleId: string) => void;
  onNavigateTab: (tab: 'home' | 'expenses' | 'utilities' | 'report' | 'group' | 'chat') => void;
  onDeleteExpense?: (id: string) => void;
  onRestoreExpenses?: (expenses: Expense[]) => void;
  payToTransactions?: PayToTransaction[];
  onMarkPayToReceived?: (txId: string) => void;
  onUpdatePayToAmount?: (txId: string, newAmount: number) => void;
  onDeletePayToTransaction?: (txId: string) => void;
  onOpenPayTo?: () => void;
}

const CHART_COLORS = ['#48BB47', '#CDDC39', '#FFC107', '#E91E63', '#2196F3', '#9C27B0', '#00BCD4', '#FF9800'];

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
      {typeof value === 'number' ? formatAmountNumber(value) : value}
    </text>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  group,
  allGroups = [],
  expenses,
  allExpenses = [],
  utilities,
  rent,
  sheetsConfig,
  onSyncNow,
  isSyncing,
  preferredCurrency = 'AED',
  customRates,
  currentUser,
  onOpenCurrencySettings,
  onOpenArchGuide,
  onOpenLoginModal,
  billingCycleType = 'current',
  onToggleCycle,
  selectedPreviousCycle,
  onSelectPreviousCycle,
  onNavigateTab,
  onDeleteExpense,
  payToTransactions = [],
  onMarkPayToReceived,
  onUpdatePayToAmount,
  onDeletePayToTransaction,
  onOpenPayTo,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [isUserFilterOpen, setIsUserFilterOpen] = useState<boolean>(false);
  const userFilterRef = useRef<HTMLDivElement>(null);

  // Editing amount state for Active Loan Summaries
  const [editingAmountTxId, setEditingAmountTxId] = useState<string | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<string>('');

  // User matching for PayTo personal loans / borrower notices / lender summaries
  const isAdmin = currentUser?.role === 'admin';
  const currentMember = useMemo(() => {
    if (!currentUser) return null;
    return (
      (group.members || []).find(
        (m) =>
          (currentUser.idNumber && m.id === currentUser.idNumber) ||
          (currentUser.name && m.name.toLowerCase() === currentUser.name.toLowerCase()) ||
          (currentUser.mobileNumber && isPhoneMatch(m.phone || m.mobileNumber, currentUser.mobileNumber)) ||
          (currentUser.email && m.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
      ) || null
    );
  }, [group.members, currentUser]);

  const borrowerActiveNotices = useMemo(() => {
    if (!payToTransactions || payToTransactions.length === 0) return [];
    return payToTransactions
      .filter((tx) => tx.status === 'pending' && (isAdmin || (currentMember && tx.payToId === currentMember.id)))
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
  }, [payToTransactions, isAdmin, currentMember]);

  const lenderActiveSummaries = useMemo(() => {
    if (!payToTransactions || payToTransactions.length === 0) return [];
    return payToTransactions.filter(
      (tx) => tx.status === 'pending' && (isAdmin || (currentMember && tx.payById === currentMember.id))
    );
  }, [payToTransactions, isAdmin, currentMember]);

  const handleStartEditAmount = (tx: PayToTransaction) => {
    setEditingAmountTxId(tx.id);
    setEditAmountValue(String(tx.amount));
  };

  const handleSaveEditAmount = (txId: string) => {
    const val = parseFloat(editAmountValue);
    if (!isNaN(val) && val > 0) {
      if (onUpdatePayToAmount) {
        onUpdatePayToAmount(txId, val);
        triggerHaptic(hapticPatterns.success);
      }
    }
    setEditingAmountTxId(null);
  };

  const earliestExpenseCycle = useMemo(() => {
    const all = allExpenses.length > 0 ? allExpenses : expenses;
    if (!all || all.length === 0) return undefined;
    const cycles = all
      .filter((e) => {
        const itemGroupId = e.groupId;
        if (itemGroupId && itemGroupId !== group.id) return false;
        if (!itemGroupId && group.id !== 'group-room-3') return false;
        return true;
      })
      .map((e) => e.cycle || (e.date ? e.date.slice(0, 7) : ''))
      .filter(Boolean)
      .sort();
    return cycles[0];
  }, [allExpenses, expenses, group.id]);

  const previousCycleOptions = useMemo(() => {
    return getPreviousCycleOptions(undefined, group?.createdAt || group?.cycleId, earliestExpenseCycle);
  }, [group?.createdAt, group?.cycleId, earliestExpenseCycle]);

  const activeSelectedPreviousCycleId = selectedPreviousCycle || previousCycleOptions[0]?.cycleId || '2026-07';

  // Helper to calculate total expenses for a specific cycleId from allExpenses
  const getCycleTotalExpenses = (cId: string) => {
    const targetExpenses = allExpenses.length > 0 ? allExpenses : expenses;
    return targetExpenses
      .filter((e) => {
        const itemGroupId = e.groupId;
        if (itemGroupId && itemGroupId !== group.id) return false;
        if (!itemGroupId && group.id !== 'group-room-3') return false;
        const expCycle = e.cycle || (e.date ? e.date.slice(0, 7) : '');
        return expCycle === cId;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (userFilterRef.current && !userFilterRef.current.contains(e.target as Node)) {
        setIsUserFilterOpen(false);
      }
    };
    if (isUserFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserFilterOpen]);

  // Financial Calculations
  const messTotal = expenses
    .filter((e) => e.type === 'mess')
    .reduce((sum, e) => sum + e.amount, 0);

  const generalTotal = expenses
    .filter((e) => e.type === 'general')
    .reduce((sum, e) => sum + e.amount, 0);

  const utilitiesTotal = utilities.reduce((sum, u) => sum + u.amount, 0);
  const totalGroupExpenses = messTotal + generalTotal + utilitiesTotal;

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
  const avgPerPerson = group.members.length > 0 ? totalGroupExpenses / group.members.length : 0;
  const currencyDisplay = 'AED';

  return (
    <div className="space-y-6 pb-28">
      {/* Admin Quick Controls & Tools Section - ONLY for Admin User */}
      {isAdmin && (
        <AdminQuickControlsCard
          group={group}
          allGroups={allGroups}
          sheetsConfig={sheetsConfig}
          onSyncNow={onSyncNow}
          isSyncing={isSyncing}
          preferredCurrency={preferredCurrency}
          onOpenCurrencySettings={onOpenCurrencySettings}
          onOpenArchGuide={onOpenArchGuide}
          onOpenLoginModal={onOpenLoginModal}
          onNavigateTab={onNavigateTab}
          currentUser={currentUser}
        />
      )}

      {/* 2nd Component: Billing Cycle Control & Room Info Card */}
      <div className="rounded-3xl neu-upper text-slate-900 overflow-hidden p-4 sm:p-6 space-y-4">
        {/* Billing Cycle Switcher (Full Setup moved from HeaderBar) */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#07193F] text-white rounded-2xl p-2.5 sm:p-3 shadow-md">
            <span className="text-xs text-blue-200 font-bold hidden sm:inline">Billing Cycle View:</span>
            <div className="bg-[#0B2556] p-1 rounded-xl border border-blue-400/25 inline-flex items-center gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onToggleCycle && onToggleCycle('current')}
                className={`flex-1 sm:flex-none py-1.5 px-4 rounded-lg text-xs font-extrabold transition-all text-center cursor-pointer ${
                  billingCycleType === 'current'
                    ? 'bg-[#0052FF] text-white shadow-md shadow-blue-500/30'
                    : 'text-blue-200/80 hover:text-white bg-transparent'
                }`}
              >
                Current Cycle
              </button>
              <button
                type="button"
                onClick={() => onToggleCycle && onToggleCycle('previous')}
                className={`flex-1 sm:flex-none py-1.5 px-4 rounded-lg text-xs font-extrabold transition-all text-center cursor-pointer ${
                  billingCycleType === 'previous'
                    ? 'bg-[#0052FF] text-white shadow-md shadow-blue-500/30'
                    : 'text-blue-200/80 hover:text-white bg-transparent'
                }`}
              >
                Previous Cycles
              </button>
            </div>
          </div>

          {billingCycleType === 'previous' && (
            <div className="flex items-center gap-2 pt-0.5">
              <select
                value={activeSelectedPreviousCycleId}
                onChange={(e) => {
                  if (onSelectPreviousCycle) {
                    onSelectPreviousCycle(e.target.value);
                  }
                }}
                className="w-full bg-[#07193F] text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-blue-400/30 focus:outline-none focus:border-[#0052FF] cursor-pointer shadow-sm"
              >
                {previousCycleOptions.map((opt) => {
                  const cycleTotal = getCycleTotalExpenses(opt.cycleId);
                  return (
                    <option key={opt.cycleId} value={opt.cycleId} className="bg-[#07193F] text-white">
                      {opt.label} • ({formatAmountNumber(cycleTotal)} {currencyDisplay})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* PENDING LOAN NOTES (Shown when active loan notices exist for the current user/admin) */}
      {borrowerActiveNotices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              PENDING LOAN NOTES ({borrowerActiveNotices.length})
            </h3>
          </div>

          <div className="space-y-3">
            {borrowerActiveNotices.map((tx) => (
              <div
                key={tx.id}
                className="bg-[#ffcbd1] border-2 border-rose-400 text-slate-900 rounded-3xl p-4 sm:p-5 shadow-lg neu-upper-sm relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-rose-300/60 pb-2">
                    <span className="text-xs font-black text-slate-900">
                      From: <strong className="underline font-black">{tx.payByName}</strong>
                    </span>
                    <div className="text-[20px] font-black text-slate-950 font-sans">
                      <span>Amount: {formatAmountNumber(tx.amount)} {group.currency || 'AED'}</span>
                    </div>
                  </div>

                  {/* Horizontal row with Purpose & Date on left */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold text-slate-800">
                        <strong>Purpose:</strong> {tx.purpose}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-800 flex-wrap">
                        <span><strong>Date:</strong> {formatDateDisplay(tx.date)}</span>
                        {tx.returnDate && (
                          <span className="bg-white/80 px-2 py-0.5 rounded-md font-bold text-slate-900">
                            <strong>Promised Return:</strong> {formatDateDisplay(tx.returnDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE LOAN SUMMARIES (Shown when active loan summaries exist for the current user/admin) */}
      {lenderActiveSummaries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Active Loan Summaries ({lenderActiveSummaries.length})
            </h3>
          </div>

          <div className="space-y-3">
            {lenderActiveSummaries.map((tx) => {
              const isEditing = editingAmountTxId === tx.id;

              return (
                <div
                  key={tx.id}
                  className="bg-emerald-50 border-2 border-emerald-300 text-slate-900 rounded-3xl p-4 sm:p-5 shadow-lg neu-upper-sm relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                      <span className="text-xs font-black text-slate-900">
                        Pay To: <strong className="underline font-black">{tx.payToName}</strong>
                        {isAdmin && (
                          <span className="text-[11px] text-slate-600 font-bold ml-2">
                            (From: {tx.payByName})
                          </span>
                        )}
                      </span>

                      <div className="text-[20px] font-black text-slate-950 font-sans flex items-center gap-1.5">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 font-sans">
                            <input
                              type="number"
                              step="any"
                              value={editAmountValue}
                              onChange={(e) => setEditAmountValue(e.target.value)}
                              className="w-20 bg-slate-100 text-slate-900 font-black text-xs px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditAmount(tx.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded-lg cursor-pointer"
                              title="Save Amount"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAmountTxId(null)}
                              className="bg-slate-400 hover:bg-slate-500 text-white p-1 rounded-lg cursor-pointer"
                              title="Cancel"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span>Loan: {formatAmountNumber(tx.amount)} {group.currency || 'AED'}</span>
                            <button
                              type="button"
                              onClick={() => handleStartEditAmount(tx)}
                              className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                              title="Edit loan amount"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Horizontal row with Purpose & Date on left */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 text-left">
                        <p className="text-xs font-bold text-slate-800">
                          <strong>Purpose:</strong> {tx.purpose}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-800 flex-wrap">
                          <span><strong>Date:</strong> {formatDateDisplay(tx.date)}</span>
                          {tx.returnDate && (
                            <span className="bg-white/80 px-2 py-0.5 rounded-md font-bold text-slate-900">
                              <strong>Return Date:</strong> {formatDateDisplay(tx.returnDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Payment Received & Delete with BLACK text */}
                    <div className="flex items-center gap-2 pt-2 border-t border-emerald-200">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(hapticPatterns.success);
                          if (onMarkPayToReceived) {
                            onMarkPayToReceived(tx.id);
                          }
                        }}
                        className="flex-1 bg-white hover:bg-slate-100 text-black border border-slate-300 font-black text-xs py-2.5 px-3 rounded-[24px] neu-upper-btn transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-black font-black">Payment Received</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(hapticPatterns.error);
                          if (onDeletePayToTransaction) {
                            onDeletePayToTransaction(tx.id);
                          }
                        }}
                        className="bg-white hover:bg-slate-100 text-black border border-slate-300 font-black text-xs py-2.5 px-4 rounded-[24px] neu-upper-btn transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider shadow-sm"
                        title="Delete/Clear Active Transaction"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-black font-black">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTRIBUTORS (PAID OUT OF POCKET) - Without top text / view all */}
      <div className="neu-upper rounded-[28px] p-4 sm:p-6">
        {contributorData.length > 0 ? (
          <div className="flex flex-row items-center justify-start sm:justify-center gap-3 sm:gap-8">
            {/* Pie Chart on Left */}
            <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
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
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} ${currencyDisplay}`, 'Amount Paid']}
                    contentStyle={{ borderRadius: '12px', background: '#E7E7E7', border: 'none', boxShadow: 'inset -5px -5px 12px rgba(255,255,255,0.9), inset 5px 5px 12px rgba(174,174,192,0.8)', color: '#0f172a', fontWeight: 'bold' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend list on Right */}
            <div className="flex flex-col space-y-2 sm:space-y-3 min-w-[140px] sm:min-w-[170px]">
              {contributorData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight leading-tight truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm shrink-0">
                    {formatAmountNumber(item.value)} {currencyDisplay}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-8 text-center font-medium">No expenses added yet in this cycle.</p>
        )}
      </div>

      {/* OVERVIEW (MY CONTRIBUTION & AVG PER PERSON) matching reference image */}
      <div className="space-y-2">
        <h3 className="text-lg font-black text-[#071E55] tracking-wide px-1">Overview</h3>
        <div className="p-5 md:p-6 neu-upper text-slate-900 rounded-[28px]">
          <div className="grid grid-cols-2 divide-x divide-slate-300/60">
            {/* Left Column: My Contribution */}
            <div className="flex flex-col items-center justify-center pr-3 sm:pr-6 text-center space-y-2.5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Ring */}
                  <path
                    className="text-slate-300"
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
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-[#0F3DFF] mb-0.5" />
                  <span className="text-xs sm:text-sm font-black text-[#071E55]">{myPercentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-base sm:text-xl font-black text-[#071E55] block">
                  {formatAmountNumber(mySpent)} AED
                </span>
                <span className="text-xs font-bold text-slate-500 tracking-tight block">
                  My Contribution
                </span>
              </div>
            </div>

            {/* Right Column: Avg. per Person */}
            <div className="flex flex-col items-center justify-center pl-3 sm:pl-6 text-center space-y-2.5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full neu-lower-sm flex flex-col items-center justify-center space-y-0.5">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#0F3DFF]" />
                <span className="text-xs sm:text-sm font-black text-[#071E55]">÷ {group.members.length}</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">members</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-base sm:text-xl font-black text-[#071E55] block">
                  {formatAmountNumber(avgPerPerson)} AED
                </span>
                <span className="text-xs font-bold text-slate-500 tracking-tight block">
                  Avg. per Person
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT EXPENSES Section */}
      <div className="p-5 neu-upper text-slate-900 rounded-3xl space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-300/60 pb-3">
          <h3 className="text-base font-black text-[#07193F] tracking-wide uppercase">
            RECENT EXPENSES
          </h3>

          <span className="text-[10px] sm:text-xs font-extrabold bg-[#0052FF] text-white px-3 py-1 rounded-full uppercase tracking-wider shadow-xs shrink-0">
            {expenses.length} Total Expenses
          </span>
        </div>

        {/* Member Filter Dropdown / Collapsible */}
        <div ref={userFilterRef} className="relative space-y-1.5 z-20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Filter by User:
            </span>
            {selectedUserFilter !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUserFilter('all');
                  setIsUserFilterOpen(false);
                }}
                className="text-[11px] font-extrabold text-[#0052FF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <XIcon className="w-3 h-3" />
                <span>Reset to All Users</span>
              </button>
            )}
          </div>

          <div className="relative">
            {/* Trigger Button */}
            {(() => {
              const selectedMember = group.members.find((m) => m.id === selectedUserFilter);
              const selectedUserCount = selectedMember
                ? expenses.filter((e) => e.paidById === selectedMember.id).length
                : 0;
              const selectedUserTotal = selectedMember
                ? expenses.filter((e) => e.paidById === selectedMember.id).reduce((sum, e) => sum + e.amount, 0)
                : 0;

              return (
                <button
                  type="button"
                  onClick={() => setIsUserFilterOpen(!isUserFilterOpen)}
                  className={`w-full sm:w-auto min-w-[200px] px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs ${
                    selectedUserFilter === 'all'
                      ? 'bg-[#0052FF] text-white shadow-md'
                      : 'bg-[#07193F] text-white shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="w-4 h-4 text-white shrink-0" />
                    {selectedUserFilter === 'all' ? (
                      <span className="truncate">All Users ({expenses.length})</span>
                    ) : (
                      <div className="flex items-center gap-1.5 truncate">
                        <MemberAvatar
                          name={selectedMember?.name || 'Selected User'}
                          avatar={selectedMember?.avatar}
                          size="xs"
                          className="w-5 h-5 text-[9px] shrink-0 ring-1 ring-white/40"
                        />
                        <span className="truncate">{selectedMember?.name || 'Selected User'}</span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                          {selectedUserCount} • {formatAmountNumber(selectedUserTotal)} {currencyDisplay}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-white shrink-0 transition-transform duration-200 ${
                      isUserFilterOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              );
            })()}

            {/* Dropdown Menu (Hidden by default, shown when All Users button is clicked) */}
            {isUserFilterOpen && (
              <div className="absolute left-0 top-full mt-2 w-full sm:w-80 bg-white neu-upper rounded-2xl shadow-2xl p-2 space-y-1 z-30 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                {/* Option 1: All Users */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserFilter('all');
                    setIsUserFilterOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedUserFilter === 'all'
                      ? 'bg-[#0052FF] text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className={`w-4 h-4 ${selectedUserFilter === 'all' ? 'text-white' : 'text-slate-600'}`} />
                    <span>All Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-extrabold ${selectedUserFilter === 'all' ? 'text-blue-100' : 'text-slate-500'}`}>
                      {expenses.length} expenses
                    </span>
                    {selectedUserFilter === 'all' && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>

                <div className="border-t border-slate-200 my-1" />

                {/* Member Options */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                  {group.members.map((member) => {
                    const userExpenses = expenses.filter((e) => e.paidById === member.id);
                    const userCount = userExpenses.length;
                    const userTotal = userExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const isSelected = selectedUserFilter === member.id;

                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserFilter(member.id);
                          setIsUserFilterOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#0052FF] text-white shadow-xs'
                            : 'hover:bg-slate-100 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MemberAvatar
                            name={member.name}
                            avatar={member.avatar}
                            size="xs"
                            className="w-6 h-6 text-[10px] shrink-0"
                          />
                          <span className="truncate">{member.name}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold ${
                            isSelected ? 'text-blue-100' : 'text-slate-500'
                          }`}>
                            {userCount} exp • {formatAmountNumber(userTotal)} {currencyDisplay}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              <div className="py-8 text-center neu-lower-sm rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-500">No expenses recorded for this user in the running month.</p>
              </div>
            );
          }

          const reversedList = [...displayedList].reverse();
          const visibleItems = showAllExpenses ? reversedList : reversedList.slice(0, 5);

          return (
            <div className="space-y-2.5">
              {visibleItems.map((exp) => {
                const payer = group.members.find(
                  (m) =>
                    m.id === exp.paidById ||
                    m.name.toLowerCase() === exp.paidById.toLowerCase() ||
                    (exp.paidByName && m.name.toLowerCase() === exp.paidByName.toLowerCase())
                );
                const isMess = exp.type === 'mess';

                return (
                  <div
                    key={exp.id}
                    className="neu-upper-sm rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2 transition-all text-slate-900"
                  >
                    {/* Left: User Badge with Profile Image, Title, Date */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 bg-[#0052FF] text-white font-extrabold text-[11px] sm:text-xs pl-1.5 pr-2.5 py-1 rounded-xl shrink-0 shadow-2xs">
                        <MemberAvatar
                          name={payer?.name || exp.paidById}
                          avatar={payer?.avatar}
                          size="xs"
                          className="w-5 h-5 text-[9px] shrink-0 ring-1 ring-white/40"
                        />
                        <span className="truncate max-w-[85px] sm:max-w-[130px]">
                          {payer?.name || exp.paidById}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-[#07193F] truncate">{cleanExpenseTitle(exp.title)}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 shrink-0">
                            {isMess ? 'Mess' : 'Gen'}
                          </span>
                          {exp.sharedWithIds && exp.sharedWithIds.length > 0 && exp.sharedWithIds.length < group.members.length && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 shrink-0">
                              Shared: {exp.sharedWithIds.length}/{group.members.length}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium block truncate">
                          {formatDateDisplay(exp.date)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Amount & Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <DualCurrencyDisplay
                        amount={exp.amount}
                        baseCurrency={group.currency}
                        preferredCurrency={preferredCurrency}
                        customRates={customRates}
                        layout="inline"
                        baseClassName="text-xs sm:text-sm font-black text-[#07193F]"
                      />

                      {onDeleteExpense && currentUser?.role === 'admin' && (
                        <div>
                          {deleteConfirmId === exp.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-xl border border-rose-200">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteExpense(exp.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                              >
                                Del
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 bg-white text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200 cursor-pointer"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(exp.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 cursor-pointer"
                              title="Delete expense"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
                    className="px-5 py-2.5 bg-[#0052FF] hover:bg-[#0047E0] text-white text-xs font-black rounded-2xl border border-blue-400/20 hover:shadow-lg transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
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
  );
};
