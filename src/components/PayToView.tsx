import React, { useState } from 'react';
import { Group, UserAuthProfile, PayToTransaction, RentContribution } from '../types';
import {
  HandCoins,
  Send,
  CheckCircle2,
  Trash2,
  DollarSign,
  Clock,
  ShieldCheck,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { isPhoneMatch } from '../lib/firebase';
import { formatAmountNumber } from '../utils/currency';
import { formatDateDisplay } from '../utils/dateUtils';

interface PayToViewProps {
  group: Group;
  currentUser?: UserAuthProfile | null;
  payToTransactions: PayToTransaction[];
  rentContribution?: RentContribution;
  onSaveTransaction: (tx: PayToTransaction) => void;
  onUpdateAmount: (txId: string, newAmount: number) => void;
  onMarkReceived: (txId: string) => void;
  onDeleteTransaction: (txId: string) => void;
  onHardDeletePreviousRecord: (txId: string) => void;
  preferredCurrency: string;
}

export const PayToView: React.FC<PayToViewProps> = ({
  group,
  currentUser,
  payToTransactions = [],
  rentContribution,
  onSaveTransaction,
  onUpdateAmount,
  onMarkReceived,
  onDeleteTransaction,
  onHardDeletePreviousRecord,
  preferredCurrency,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Identify logged in member in the current group
  const currentMember = (group?.members || []).find(
    (m) =>
      (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.mobileNumber &&
        (isPhoneMatch(m.phone, currentUser.mobileNumber) ||
          isPhoneMatch(m.mobileNumber, currentUser.mobileNumber))) ||
      (currentUser?.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase()))
  );

  // Combine standard group members with temporary room/rent members
  const tempMembers = rentContribution?.temporaryMembers || [];
  const allMembers = [
    ...group.members.map((m) => ({ id: m.id, name: m.name })),
    ...tempMembers.map((tName) => ({
      id: `temp_${tName}`,
      name: `${tName} (Temp Member)`,
    })),
  ];

  const defaultPayById = isAdmin
    ? allMembers[0]?.id || ''
    : currentMember?.id || allMembers[0]?.id || '';

  const defaultPayToId = allMembers.find((m) => m.id !== defaultPayById)?.id || allMembers[0]?.id || '';

  // Form state
  const [payById, setPayById] = useState<string>(defaultPayById);
  const [payToId, setPayToId] = useState<string>(defaultPayToId);
  const [purpose, setPurpose] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(() => {
    const d = new Date();
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}`;
  });

  // Editing state for active lender summary
  const [editingAmountTxId, setEditingAmountTxId] = useState<string | null>(null);
  const [tempEditAmount, setTempEditAmount] = useState<string>('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const lender = allMembers.find((m) => m.id === payById) || (currentMember ? { id: currentMember.id, name: currentMember.name } : allMembers[0]);
    const borrower = allMembers.find((m) => m.id === payToId);

    if (!lender || !borrower) {
      alert('Please select both Lender (Paid By) and Borrower (Paid To).');
      return;
    }

    if (lender.id === borrower.id) {
      alert('Lender and Borrower cannot be the same person.');
      return;
    }

    const newTx: PayToTransaction = {
      id: `payto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      groupId: group.id,
      payById: lender.id,
      payByName: lender.name,
      payToId: borrower.id,
      payToName: borrower.name,
      purpose: purpose.trim() || 'Personal Loan / Payment',
      amount: numAmount,
      date: dateStr,
      status: 'pending',
      createdAtMs: Date.now(),
    };

    triggerHaptic(hapticPatterns.success);
    onSaveTransaction(newTx);

    // Reset form
    setPurpose('');
    setAmount('');
    alert('Transaction saved successfully!');
  };

  // Active Pending Summaries where logged-in user is Lender ("PAY BY") or Admin
  const lenderActiveSummaries = payToTransactions.filter((tx) => {
    if (tx.status !== 'pending') return false;
    if (isAdmin) return true;
    return currentMember && tx.payById === currentMember.id;
  });

  // Active Pending Notices where logged-in user is Borrower ("PAY TO") or Admin
  // Stacked oldest first (createdAtMs ascending)
  const borrowerActiveNotices = payToTransactions
    .filter((tx) => {
      if (tx.status !== 'pending') return false;
      if (isAdmin) return true;
      return currentMember && tx.payToId === currentMember.id;
    })
    .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

  // Previous Records (Includes all recorded transactions - Pending & Paid)
  const previousRecords = payToTransactions.filter((tx) => {
    if (isAdmin) return true;
    if (!currentMember) return false;
    return tx.payById === currentMember.id || tx.payToId === currentMember.id;
  });

  const previousGrandTotal = previousRecords.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6 pb-28 pt-2 px-3 sm:px-6 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Title Header - Navy Theme with Neumorphic shadow */}
      <div
        className="p-4 sm:p-6 rounded-3xl shadow-xl bg-gradient-to-r from-[#07193F] to-[#041029] text-white neu-upper border-none"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0052FF] text-white flex items-center justify-center border border-blue-400/30 shadow-md shrink-0">
              <HandCoins className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                PERSONAL FINANCIAL LEDGER
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
                PAY TO (Personal Loan & Repayment)
              </h2>
              <p className="text-xs text-blue-100/80 font-medium">
                Strictly private personal tracking between group members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-white/10 text-white font-black text-xs px-3 py-1.5 rounded-2xl border border-white/20 shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isAdmin ? 'Admin View (Global Access)' : 'Private Member View'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1. Transaction Form */}
      <div
        className="p-5 sm:p-6 rounded-3xl neu-upper border-none text-slate-900"
      >
        <div className="border-b border-slate-300 pb-3 mb-4 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <DollarSign className="w-4 h-4 text-slate-900" />
            Create Loan Entry ("PAY TO")
          </h3>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-bold">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Paid By */}
            <div className="flex flex-col relative">
              <div className="relative flex items-center w-full">
                {isAdmin ? (
                  <div className="relative w-full flex items-center">
                    <select
                      value={payById}
                      onChange={(e) => setPayById(e.target.value)}
                      className="w-full h-[42px] pl-3.5 pr-40 neu-lower rounded-2xl text-xs font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer"
                    >
                      {allMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 pointer-events-none flex items-center gap-1 text-[10px] font-black text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded-md uppercase tracking-tight">
                      <span>Paid By (Lender) *</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-800 stroke-[2.5]" />
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full flex items-center">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={currentMember?.name || currentUser?.name || 'Logged-in User'}
                      className="w-full h-[42px] pl-3.5 pr-36 neu-lower rounded-2xl text-xs font-bold text-slate-900 cursor-not-allowed opacity-90"
                    />
                    <span className="absolute right-2.5 pointer-events-none text-[10px] font-black text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded-md uppercase tracking-tight">
                      Paid By (Lender) *
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Paid To */}
            <div className="flex flex-col relative">
              <div className="relative flex items-center w-full">
                <select
                  value={payToId}
                  onChange={(e) => setPayToId(e.target.value)}
                  className="w-full h-[42px] pl-3.5 pr-44 neu-lower rounded-2xl text-xs font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer"
                >
                  {allMembers
                    .filter((m) => isAdmin || m.id !== (currentMember?.id || payById))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
                <div className="absolute right-2.5 pointer-events-none flex items-center gap-1 text-[10px] font-black text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded-md uppercase tracking-tight">
                  <span>Paid To (Borrower) *</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-800 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div className="flex flex-col relative">
              <div className="relative flex items-center w-full">
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full h-[42px] pl-3.5 pr-24 neu-lower rounded-2xl text-xs font-bold text-slate-900 focus:outline-none"
                />
                <span className="absolute right-2.5 pointer-events-none text-[10px] font-black text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded-md uppercase tracking-tight">
                  Purpose *
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col relative">
              <div className="relative flex items-center w-full">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-[42px] pl-3.5 pr-28 neu-lower rounded-2xl text-xs font-black text-slate-900 focus:outline-none"
                />
                <span className="absolute right-2.5 pointer-events-none text-[10px] font-black text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded-md uppercase tracking-tight">
                  Amount ({group.currency || preferredCurrency}) *
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col relative">
              <div className="relative flex items-center w-full">
                <input
                  type="text"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full h-[42px] pl-3.5 pr-24 neu-lower rounded-2xl text-xs font-bold text-slate-900 focus:outline-none"
                />
                <span className="absolute right-2.5 pointer-events-none text-[10px] font-black text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded-md uppercase tracking-tight">
                  Date & Time
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] text-white font-black text-xs rounded-[24px] neu-upper-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>SAVE TRANSACTION</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. PREVIOUS RECORD Table (Frozen History Table) */}
      <div
        className="p-5 sm:p-6 rounded-3xl neu-upper border-none text-slate-900"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-300 pb-4 mb-4">
          <div>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              HISTORY & ARCHIVE
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-900" />
              PREVIOUS RECORD Table
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Frozen settlement records.
            </p>
          </div>
        </div>

        {/* PREVIOUS RECORD View - Mobile Stacked Cards (Fits 100% Mobile Screen Width) */}
        <div className="block sm:hidden space-y-3">
          {previousRecords.length === 0 ? (
            <div className="p-6 text-center text-slate-500 font-medium italic rounded-2xl neu-lower-sm text-xs">
              No previous record entries found.
            </div>
          ) : (
            previousRecords.map((tx) => (
              <div
                key={`mob_${tx.id}`}
                className="neu-upper-sm rounded-2xl p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between border-b border-slate-300/60 pb-2">
                  <span className="text-[11px] font-bold text-slate-600">{formatDateDisplay(tx.date)}</span>
                  {tx.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300 text-[10px]">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                      </span>
                      Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 text-[10px]">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Paid
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase block">PAY BY (Lender)</span>
                    <span className="font-black text-slate-900 break-words">{tx.payByName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase block">PAY TO (Borrower)</span>
                    <span className="font-black text-slate-900 break-words">{tx.payToName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-300/60">
                  <div className="pr-2">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Purpose</span>
                    <span className="text-xs font-bold text-slate-800 break-words">{tx.purpose}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Amount</span>
                    <span className="text-sm font-black text-slate-950 underline decoration-1">
                      {formatAmountNumber(tx.amount)} {group.currency || preferredCurrency}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-2 border-t border-slate-300/60 flex justify-end">
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            'ADMIN HARD DELETE: Are you sure you want to permanently delete this record?'
                          )
                        ) {
                          triggerHaptic(hapticPatterns.error);
                          onHardDeletePreviousRecord(tx.id);
                        }
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] px-3 py-1 rounded-xl shadow-xs active:scale-95 cursor-pointer"
                    >
                      Hard Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Mobile Grand Total Card */}
          <div className="neu-lower-sm rounded-2xl p-3.5 flex items-center justify-between font-black text-xs text-slate-950">
            <span className="uppercase tracking-wider">Grand Total (All):</span>
            <span className="text-sm underline decoration-2">{formatAmountNumber(previousGrandTotal)} {group.currency || preferredCurrency}</span>
          </div>
        </div>

        {/* PREVIOUS RECORD View - Desktop Full Table (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto w-full neu-lower-sm rounded-2xl p-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-black uppercase tracking-wider text-[11px] rounded-xl overflow-hidden">
                <th className="p-3 rounded-l-xl">Date</th>
                <th className="p-3">PAY BY (Lender)</th>
                <th className="p-3">PAY TO (Borrower)</th>
                <th className="p-3">Purpose</th>
                <th className="p-3 text-right">Amount ({group.currency || preferredCurrency})</th>
                <th className="p-3 text-center">Status</th>
                {isAdmin && <th className="p-3 text-center rounded-r-xl">Admin Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300/60 font-bold text-slate-900">
              {previousRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="p-6 text-center text-slate-500 font-medium italic"
                  >
                    No previous record entries found.
                  </td>
                </tr>
              ) : (
                previousRecords.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-200/50 transition-colors">
                    <td className="p-3 whitespace-nowrap text-slate-700 font-medium">
                      {formatDateDisplay(tx.date)}
                    </td>
                    <td className="p-3 whitespace-nowrap font-black text-slate-900">
                      {tx.payByName}
                    </td>
                    <td className="p-3 whitespace-nowrap font-black text-slate-900">
                      {tx.payToName}
                    </td>
                    <td className="p-3 text-slate-800 max-w-xs truncate">
                      {tx.purpose}
                    </td>
                    <td className="p-3 text-right font-black text-slate-950 whitespace-nowrap">
                      {formatAmountNumber(tx.amount)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {tx.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-600 font-black bg-rose-50 px-2.5 py-1 rounded-full border border-rose-300">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                          </span>
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-black bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                          </span>
                          Paid
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                'ADMIN HARD DELETE: Are you sure you want to permanently delete this record? This action cannot be undone.'
                              )
                            ) {
                              triggerHaptic(hapticPatterns.error);
                              onHardDeletePreviousRecord(tx.id);
                            }
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] px-2.5 py-1 rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
                          title="Admin Hard Delete"
                        >
                          Hard Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {/* Grand Total Footer */}
            <tfoot>
              <tr className="bg-slate-200/80 border-t-2 border-slate-300 font-black text-slate-950 text-xs">
                <td colSpan={4} className="p-3 text-right uppercase tracking-wider">
                  Grand Total (All):
                </td>
                <td className="p-3 text-right text-sm underline decoration-2 underline-offset-2">
                  {formatAmountNumber(previousGrandTotal)} {group.currency || preferredCurrency}
                </td>
                <td colSpan={isAdmin ? 2 : 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
