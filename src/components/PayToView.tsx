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
} from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

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
        m.phone?.replace(/\D/g, '').includes(currentUser.mobileNumber.replace(/\D/g, '').slice(-7))) ||
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

  // Filter state for Previous Record table
  const [previousRecordNameFilter, setPreviousRecordNameFilter] = useState<string>('all');

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

  // Filtered Previous Records
  const filteredPreviousRecords = previousRecords.filter((tx) => {
    if (previousRecordNameFilter === 'all') return true;
    return (
      tx.payById === previousRecordNameFilter ||
      tx.payToId === previousRecordNameFilter ||
      tx.payByName === previousRecordNameFilter ||
      tx.payToName === previousRecordNameFilter
    );
  });

  const previousGrandTotal = filteredPreviousRecords.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6 pb-28 pt-2 px-3 sm:px-6 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Title Header - Navy Theme */}
      <GlassContainer
        variant="card"
        blur="3xl"
        className="p-4 sm:p-6 rounded-3xl border border-blue-900/40 shadow-xl bg-gradient-to-r from-[#07193F] to-[#041029] text-white"
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
      </GlassContainer>

      {/* 1. Transaction Form */}
      <GlassContainer
        variant="card"
        blur="3xl"
        className="p-5 sm:p-6 rounded-3xl border border-blue-400/25 shadow-xl bg-[#0B2556] text-white"
      >
        <div className="border-b border-blue-400/20 pb-3 mb-4 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <DollarSign className="w-4 h-4 text-blue-300" />
            Create Loan Entry ("PAY TO")
          </h3>
          <span className="text-[11px] font-bold text-blue-200 bg-[#07193F] px-2.5 py-0.5 rounded-full border border-blue-400/30">
            Lender Form
          </span>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-bold">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Paid By */}
            <div className="flex flex-col">
              <label className="block text-xs font-extrabold text-white uppercase mb-1.5">
                1. Paid By (Lender) *
              </label>
              {isAdmin ? (
                <select
                  value={payById}
                  onChange={(e) => setPayById(e.target.value)}
                  className="w-full h-[42px] px-3.5 bg-[#07193F] border border-blue-400/30 rounded-2xl text-xs font-bold text-white focus:ring-2 focus:ring-[#0052FF] focus:outline-none"
                >
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentMember?.name || currentUser?.name || 'Logged-in User'}
                  className="w-full h-[42px] px-3.5 bg-[#07193F]/80 border border-blue-400/20 rounded-2xl text-xs font-bold text-white cursor-not-allowed opacity-90"
                />
              )}
            </div>

            {/* Paid To */}
            <div className="flex flex-col">
              <label className="block text-xs font-extrabold text-white uppercase mb-1.5">
                2. Paid To (Borrower) *
              </label>
              <select
                value={payToId}
                onChange={(e) => setPayToId(e.target.value)}
                className="w-full h-[42px] px-3.5 bg-[#07193F] border border-blue-400/30 rounded-2xl text-xs font-bold text-white focus:ring-2 focus:ring-[#0052FF] focus:outline-none"
              >
                {allMembers
                  .filter((m) => isAdmin || m.id !== (currentMember?.id || payById))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Purpose */}
            <div className="flex flex-col">
              <label className="block text-xs font-extrabold text-white uppercase mb-1.5">
                3. Purpose *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Lunch loan, Cash emergency"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full h-[42px] px-3.5 bg-[#07193F] border border-blue-400/30 rounded-2xl text-xs font-bold text-white placeholder-blue-300/40 focus:ring-2 focus:ring-[#0052FF] focus:outline-none"
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col">
              <label className="block text-xs font-extrabold text-white uppercase mb-1.5">
                4. Amount ({group.currency || preferredCurrency}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-[42px] px-3.5 bg-[#07193F] border border-blue-400/30 rounded-2xl text-xs font-black text-white placeholder-blue-300/40 focus:ring-2 focus:ring-[#0052FF] focus:outline-none"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col">
              <label className="block text-xs font-extrabold text-white uppercase mb-1.5">
                5. Date & Time
              </label>
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full h-[42px] px-3.5 bg-[#07193F] border border-blue-400/30 rounded-2xl text-xs font-bold text-white focus:ring-2 focus:ring-[#0052FF] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-[#0052FF] hover:bg-blue-600 text-white font-black text-xs rounded-2xl border border-blue-400/40 shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>SAVE TRANSACTION</span>
            </button>
          </div>
        </form>
      </GlassContainer>

      {/* 2. Borrower Notices Section ("PAY TO" User Notice Boxes) */}
      {borrowerActiveNotices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Borrower Notices ({borrowerActiveNotices.length})
            </h3>
          </div>

          <div className="space-y-3">
            {borrowerActiveNotices.map((tx) => (
              <div
                key={tx.id}
                className="bg-rose-950/40 border-2 border-rose-500/60 text-white rounded-3xl p-4 sm:p-5 shadow-lg relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-400 uppercase tracking-wider">
                        Pending Loan Notice
                      </span>
                      <span className="text-xs font-black text-white">
                        Lender: <strong className="underline text-blue-200">{tx.payByName}</strong>
                      </span>
                    </div>

                    <div className="text-lg font-black text-white flex items-center gap-2 mt-1">
                      <span>Borrowed: {tx.amount.toFixed(2)} {group.currency || preferredCurrency}</span>
                    </div>

                    <p className="text-xs font-bold text-blue-100">
                      <strong>Purpose:</strong> {tx.purpose}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-medium text-blue-200 flex-wrap pt-1">
                      <span><strong>Date:</strong> {tx.date}</span>
                      {tx.returnDate && (
                        <span className="bg-[#07193F] px-2 py-0.5 rounded-md border border-blue-400/30 font-bold text-white">
                          <strong>Promised Return:</strong> {tx.returnDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-[#07193F] p-2.5 rounded-2xl border border-rose-500/40 shrink-0 self-start sm:self-auto">
                    <Clock className="w-4 h-4 text-rose-400 animate-spin" />
                    <span className="text-xs font-black text-rose-300">Pending Repayment</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Lender Active Summaries Section ("PAY BY" User Light Green Boxes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Active Loan Summaries ({lenderActiveSummaries.length})
          </h3>
          <span className="text-[11px] font-bold text-blue-200">
            Categorized by Borrower
          </span>
        </div>

        {lenderActiveSummaries.length === 0 ? (
          <div className="bg-[#0B2556] border-2 border-dashed border-blue-400/30 rounded-3xl p-6 text-center text-blue-200 text-xs font-bold">
            No active pending loan summaries currently.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lenderActiveSummaries.map((tx) => {
              const isEditing = editingAmountTxId === tx.id;

              return (
                <div
                  key={tx.id}
                  className="bg-[#07193F] border border-emerald-500/40 text-white rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-blue-400/20 pb-2">
                      <div>
                        <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                          Paid To (Borrower)
                        </span>
                        <h4 className="text-base font-black text-white">
                          {tx.payToName}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-extrabold text-blue-300 uppercase tracking-wider">
                          Paid By (Lender)
                        </span>
                        <p className="text-xs font-bold text-white">
                          {tx.payByName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-blue-100">
                        <strong>Purpose:</strong> {tx.purpose}
                      </p>
                      <p className="text-[11px] font-medium text-blue-200">
                        <strong>Date:</strong> {tx.date}
                      </p>
                      {tx.returnDate && (
                        <p className="text-[11px] font-bold text-emerald-300">
                          <strong>Return Date:</strong> {tx.returnDate}
                        </p>
                      )}
                    </div>

                    {/* Amount Block (Editable ONLY by Lender & Admin) */}
                    <div className="bg-[#0B2556] p-3 rounded-2xl border border-blue-400/30 flex items-center justify-between gap-2 shadow-xs">
                      <span className="text-xs font-extrabold text-blue-200 uppercase">
                        Loan Amount:
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            value={tempEditAmount}
                            onChange={(e) => setTempEditAmount(e.target.value)}
                            className="w-24 px-2 py-1 bg-[#07193F] border border-blue-400/40 rounded-xl text-xs font-black text-white focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const newNum = parseFloat(tempEditAmount);
                              if (!isNaN(newNum) && newNum > 0) {
                                onUpdateAmount(tx.id, newNum);
                                triggerHaptic(hapticPatterns.success);
                              }
                              setEditingAmountTxId(null);
                            }}
                            className="bg-[#0052FF] text-white text-[10px] font-black px-2.5 py-1 rounded-xl border border-blue-400/40 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white">
                            {tx.amount.toFixed(2)} {group.currency || preferredCurrency}
                          </span>
                          <button
                            onClick={() => {
                              setEditingAmountTxId(tx.id);
                              setTempEditAmount(String(tx.amount));
                            }}
                            className="text-[10px] bg-[#07193F] hover:bg-blue-900/40 text-blue-200 font-extrabold px-2 py-0.5 rounded-lg border border-blue-400/30 cursor-pointer"
                            title="Edit Amount"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Payment Received & Delete */}
                  <div className="flex items-center gap-2 pt-2 border-t border-blue-400/20">
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Confirm payment received from ${tx.payToName} for ${tx.amount.toFixed(
                              2
                            )} ${group.currency}? This moves the transaction to PREVIOUS RECORD.`
                          )
                        ) {
                          triggerHaptic(hapticPatterns.success);
                          onMarkReceived(tx.id);
                        }
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-3 rounded-2xl border border-emerald-400/40 shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Payment Received</span>
                    </button>

                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to delete/settle active transaction with ${tx.payToName}?`
                          )
                        ) {
                          triggerHaptic(hapticPatterns.error);
                          onDeleteTransaction(tx.id);
                        }
                      }}
                      className="bg-rose-950/60 hover:bg-rose-900 text-rose-200 font-black text-xs py-2.5 px-3 rounded-2xl border border-rose-500/40 transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                      title="Delete/Clear Active Transaction"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. PREVIOUS RECORD Table (Frozen History Table) */}
      <GlassContainer
        variant="card"
        blur="3xl"
        className="p-5 sm:p-6 rounded-3xl border border-blue-400/25 shadow-xl bg-[#0B2556] text-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-400/20 pb-4 mb-4">
          <div>
            <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">
              HISTORY & ARCHIVE
            </span>
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-300" />
              PREVIOUS RECORD Table
            </h3>
            <p className="text-xs text-blue-200/80 font-medium">
              Frozen settlement records.
            </p>
          </div>

          {/* Name Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-300" />
            <select
              value={previousRecordNameFilter}
              onChange={(e) => setPreviousRecordNameFilter(e.target.value)}
              className="bg-[#07193F] text-white font-bold text-xs px-3 py-2 rounded-2xl border border-blue-400/30 focus:outline-none shadow-xs cursor-pointer"
            >
              <option value="all">Filter: All Names</option>
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PREVIOUS RECORD View - Mobile Stacked Cards (Fits 100% Mobile Screen Width) */}
        <div className="block sm:hidden space-y-3">
          {filteredPreviousRecords.length === 0 ? (
            <div className="p-6 text-center text-blue-200/70 font-medium italic border border-blue-400/20 rounded-2xl bg-[#07193F] text-xs">
              No previous record entries found.
            </div>
          ) : (
            filteredPreviousRecords.map((tx) => (
              <div
                key={`mob_${tx.id}`}
                className="bg-[#07193F] border border-blue-400/25 rounded-2xl p-3.5 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-blue-400/15 pb-2">
                  <span className="text-[11px] font-bold text-blue-200">{tx.date}</span>
                  {tx.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-300 font-black bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-400/30 text-[10px]">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                      </span>
                      Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-300 font-black bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 text-[10px]">
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
                    <span className="text-[10px] font-extrabold text-blue-300 uppercase block">PAY BY (Lender)</span>
                    <span className="font-black text-white break-words">{tx.payByName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-300 uppercase block">PAY TO (Borrower)</span>
                    <span className="font-black text-white break-words">{tx.payToName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-blue-400/15">
                  <div className="pr-2">
                    <span className="text-[10px] font-extrabold text-blue-300 uppercase block">Purpose</span>
                    <span className="text-xs font-bold text-blue-100 break-words">{tx.purpose}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-extrabold text-blue-300 uppercase block">Amount</span>
                    <span className="text-sm font-black text-white underline decoration-1">
                      {tx.amount.toFixed(2)} {group.currency || preferredCurrency}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-2 border-t border-blue-400/15 flex justify-end">
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
                      className="bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] px-3 py-1 rounded-xl border border-rose-400/40 shadow-xs active:scale-95 cursor-pointer"
                    >
                      Hard Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Mobile Grand Total Card */}
          <div className="bg-[#07193F] border border-blue-400/30 rounded-2xl p-3.5 flex items-center justify-between font-black text-xs text-white shadow-xs">
            <span className="uppercase tracking-wider">Grand Total ({previousRecordNameFilter === 'all' ? 'All' : 'Filtered'}):</span>
            <span className="text-sm underline decoration-2">{previousGrandTotal.toFixed(2)} {group.currency || preferredCurrency}</span>
          </div>
        </div>

        {/* PREVIOUS RECORD View - Desktop Full Table (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto w-full border border-blue-400/25 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#07193F] text-blue-200 font-black uppercase tracking-wider text-[11px] border-b border-blue-400/20">
                <th className="p-3">Date</th>
                <th className="p-3">PAY BY (Lender)</th>
                <th className="p-3">PAY TO (Borrower)</th>
                <th className="p-3">Purpose</th>
                <th className="p-3 text-right">Amount ({group.currency || preferredCurrency})</th>
                <th className="p-3 text-center">Status</th>
                {isAdmin && <th className="p-3 text-center">Admin Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-400/15 font-bold text-white">
              {filteredPreviousRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="p-6 text-center text-blue-200/70 font-medium italic"
                  >
                    No previous record entries found.
                  </td>
                </tr>
              ) : (
                filteredPreviousRecords.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#07193F]/50 transition-colors">
                    <td className="p-3 whitespace-nowrap text-blue-200 font-medium">
                      {tx.date}
                    </td>
                    <td className="p-3 whitespace-nowrap font-black text-white">
                      {tx.payByName}
                    </td>
                    <td className="p-3 whitespace-nowrap font-black text-white">
                      {tx.payToName}
                    </td>
                    <td className="p-3 text-blue-100 max-w-xs truncate">
                      {tx.purpose}
                    </td>
                    <td className="p-3 text-right font-black text-white whitespace-nowrap">
                      {tx.amount.toFixed(2)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {tx.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-300 font-black bg-rose-500/20 px-2.5 py-1 rounded-full border border-rose-400/30">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                          </span>
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-300 font-black bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30">
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
                          className="bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] px-2.5 py-1 rounded-xl border border-rose-400/40 shadow-xs cursor-pointer transition-all active:scale-95"
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
              <tr className="bg-[#07193F] border-t border-blue-400/30 font-black text-white text-xs">
                <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-blue-200">
                  Grand Total ({previousRecordNameFilter === 'all' ? 'All' : 'Filtered'}):
                </td>
                <td className="p-3 text-right text-sm underline decoration-2 underline-offset-2">
                  {previousGrandTotal.toFixed(2)} {group.currency || preferredCurrency}
                </td>
                <td colSpan={isAdmin ? 2 : 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassContainer>
    </div>
  );
};
