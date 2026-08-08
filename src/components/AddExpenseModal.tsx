import React, { useState, useEffect, useRef } from 'react';
import { Group, ExpenseCategory, UserAuthProfile } from '../types';
import { X, Utensils, ShoppingBag, Upload, Calendar as CalendarIcon, UserCheck, DollarSign, Check, Calculator, AlertCircle } from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { isPhoneMatch } from '../lib/firebase';
import { evaluateMathExpression } from '../utils/mathEvaluator';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { isCategoryPermittedForMember, isCategoryPermittedForUser } from '../utils/permissionUtils';

interface AddExpenseModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAuthProfile | null;
  onSaveExpense: (expenseData: {
    type: ExpenseCategory;
    title: string;
    amount: number;
    paidById: string;
    sharedWithIds: string[];
    date: string;
    receiptUrl?: string;
    note?: string;
  }) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  group,
  isOpen,
  onClose,
  currentUser,
  onSaveExpense,
}) => {
  // Identify logged in member in the active group
  const loggedInMember = group.members.find(
    (m) =>
      (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.mobileNumber &&
        (isPhoneMatch(m.phone, currentUser.mobileNumber) ||
          isPhoneMatch(m.mobileNumber, currentUser.mobileNumber))) ||
      (currentUser?.name && m.name.toLowerCase() === currentUser.name.toLowerCase()) ||
      (currentUser?.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase())) ||
      (currentUser?.name && currentUser.name.toLowerCase().includes(m.name.toLowerCase()))
  ) || group.members[0] || {
    id: 'm1',
    name: currentUser?.name || 'Logged In User',
    avatar: (currentUser?.name || 'US').slice(0, 2).toUpperCase(),
    active: true,
  };

  const isMessPermitted = isCategoryPermittedForUser('mess', group, currentUser);
  const isGeneralPermitted = isCategoryPermittedForUser('general', group, currentUser);

  const [category, setCategory] = useState<ExpenseCategory>(() => {
    if (!isMessPermitted && isGeneralPermitted) return 'general';
    return 'mess';
  });

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(loggedInMember?.id || 'm1');

  // Filter members eligible for the selected category based on scope permission
  const eligibleMembers = group.members.filter((m) => isCategoryPermittedForMember(m, category));

  const [selectedMembers, setSelectedMembers] = useState<string[]>(eligibleMembers.map((m) => m.id));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMessPermitted && isGeneralPermitted && category === 'mess') {
      setCategory('general');
    }
  }, [isMessPermitted, isGeneralPermitted, category]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

  const isAdmin = currentUser?.role === 'admin';

  const groupMembersJoined = group.members.map((m) => m.id).join(',');

  useEffect(() => {
    if (isOpen) {
      setSelectedMembers(eligibleMembers.map((m) => m.id));
      if (!isAdmin) {
        if (loggedInMember) {
          setPaidById(loggedInMember.id);
        }
      } else {
        if (!paidById || !group.members.some((m) => m.id === paidById)) {
          if (loggedInMember) setPaidById(loggedInMember.id);
        }
      }
    }
  }, [isOpen, category, groupMembersJoined, loggedInMember?.id, isAdmin]);

  if (!isOpen) return null;

  const handleMemberToggle = (id: string) => {
    if (selectedMembers.includes(id)) {
      if (selectedMembers.length > 1) {
        setSelectedMembers(selectedMembers.filter((mId) => mId !== id));
      }
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleSelectAllMembers = () => {
    if (selectedMembers.length === eligibleMembers.length) {
      setSelectedMembers([paidById]);
    } else {
      setSelectedMembers(eligibleMembers.map((m) => m.id));
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const focusAmountInput = () => {
    if (amountInputRef.current) {
      amountInputRef.current.focus();
    }
  };

  const handleAppendSymbol = (symbol: string) => {
    setAmount((prev) => prev + symbol);
    triggerHaptic(hapticPatterns.click);
    setTimeout(focusAmountInput, 0);
  };

  const handleClearAmount = () => {
    setAmount('');
    triggerHaptic(hapticPatterns.click);
    setTimeout(focusAmountInput, 0);
  };

  const mathEval = evaluateMathExpression(amount);

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const res = evaluateMathExpression(amount);
      if (res.isValid && res.calculatedValue !== null && res.hasOperator) {
        e.preventDefault();
        setAmount(res.displayValue);
        triggerHaptic(hapticPatterns.success);
      }
    }
  };

  const handleAmountBlur = () => {
    const res = evaluateMathExpression(amount);
    if (res.isValid && res.calculatedValue !== null && res.hasOperator) {
      setAmount(res.displayValue);
      triggerHaptic(hapticPatterns.click);
    }
  };

  const handleApplyCalculation = () => {
    const res = evaluateMathExpression(amount);
    if (res.isValid && res.calculatedValue !== null) {
      setAmount(res.displayValue);
      triggerHaptic(hapticPatterns.success);
    }
    setTimeout(focusAmountInput, 0);
  };

  const checkExpenseDateValidity = (selectedDateStr: string, role?: string) => {
    if (role === 'admin') {
      return { isAllowed: true };
    }
    if (!selectedDateStr) return { isAllowed: true };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0 to 11
    const currentDay = now.getDate(); // 1 to 31

    const parts = selectedDateStr.split('-');
    if (parts.length < 3) return { isAllowed: true };

    const expYear = parseInt(parts[0], 10);
    const expMonthIdx = parseInt(parts[1], 10) - 1;

    const monthsDiff = (currentYear - expYear) * 12 + (currentMonthIdx - expMonthIdx);

    if (monthsDiff === 0 || monthsDiff < 0) {
      return { isAllowed: true };
    }

    if (monthsDiff === 1) {
      if (currentDay <= 7) {
        return { isAllowed: true };
      } else {
        return {
          isAllowed: false,
          errorMessage:
            'Expense entry locked: Standard users can only backdate previous month expenses up to the 7th day of the current month. The 7-day grace period has expired. Please contact an Admin to enter past expenses.',
        };
      }
    }

    return {
      isAllowed: false,
      errorMessage:
        'Expense entry locked: Standard users cannot add expenses for dates prior to the previous month. Please contact an Admin to enter older expenses.',
    };
  };

  const dateValidation = checkExpenseDateValidity(date, currentUser?.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateValidation.isAllowed) return;

    const res = evaluateMathExpression(amount);
    const parsedAmount = res.calculatedValue ?? parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!title.trim()) return;

    onSaveExpense({
      type: category,
      title: title.trim(),
      amount: parsedAmount,
      paidById,
      sharedWithIds: selectedMembers,
      date,
      receiptUrl: receiptImage || undefined,
      note: note.trim() || undefined,
    });

    // Reset and close
    setTitle('');
    setAmount('');
    setNote('');
    setReceiptImage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 overflow-y-auto flex flex-col items-center py-4 sm:py-8 px-3 sm:px-6 md:px-8 max-w-full pb-32 sm:pb-40">
      <GlassContainer
        variant="card"
        blur="3xl"
        className="w-full max-w-2xl rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden relative my-auto box-border text-slate-900 bg-white mb-20 sm:mb-24"
      >
        {/* Header - Navy Main Page Banner */}
        <div className="bg-gradient-to-r from-[#07193F] to-[#041029] text-white p-5 sm:p-6 flex items-center justify-between border-b border-blue-900/40 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-blue-200 uppercase tracking-wider bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                Shared Room Expense Log
              </span>
              <span className="text-xs font-bold text-blue-300">
                • {group.name}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Add New Expense</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-2xl transition-all border border-white/20 cursor-pointer"
            title="Back to Dashboard"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5 overflow-y-auto overflow-x-hidden flex-1 w-full box-border">
          {/* Category Tabs: Mess Bill vs General Expense */}
          {(isMessPermitted || isGeneralPermitted) ? (
            <div className={`grid ${isMessPermitted && isGeneralPermitted ? 'grid-cols-2' : 'grid-cols-1'} gap-2 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl`}>
              {isMessPermitted && (
                <button
                  type="button"
                  onClick={() => setCategory('mess')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    category === 'mess'
                      ? 'bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] text-white shadow-md shadow-blue-950/40 font-black border border-blue-400/30'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Mess Bill</span>
                </button>
              )}

              {isGeneralPermitted && (
                <button
                  type="button"
                  onClick={() => setCategory('general')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    category === 'general'
                      ? 'bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] text-white shadow-md shadow-blue-950/40 font-black border border-blue-400/30'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>General Expense</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 font-bold text-center">
              Your assigned member scope is restricted (e.g. Landlord Rent / Utilities only).
            </div>
          )}

          {/* Amount Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Expense Amount ({group.currency}) *
              </label>
              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-[#07193F]" />
                Auto-calc (e.g. 10+20+30)
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#07193F] font-black text-base pointer-events-none">
                {group.currency}
              </span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                placeholder="0.00 (e.g. 10+20+30)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleAmountKeyDown}
                onBlur={handleAmountBlur}
                className="w-full pl-16 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-slate-900 placeholder-slate-400 focus:border-[#07193F] focus:ring-2 focus:ring-[#07193F]/20 focus:outline-none"
              />
            </div>

            {/* Quick Math Symbols Keyboard Strip */}
            <div className="flex items-center gap-1.5 mt-2 w-full max-w-full overflow-x-auto pb-1 scrollbar-none touch-pan-x">
              <span className="text-slate-500 shrink-0 mr-0.5 flex items-center">
                <Calculator className="w-3.5 h-3.5 text-[#07193F]" />
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('+')}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-black text-base rounded-xl border border-slate-200 transition-all cursor-pointer min-w-[36px]"
              >
                +
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('-')}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-black text-base rounded-xl border border-slate-200 transition-all cursor-pointer min-w-[36px]"
              >
                -
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('*')}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-black text-base rounded-xl border border-slate-200 transition-all cursor-pointer min-w-[36px]"
              >
                ×
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('/')}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-black text-base rounded-xl border border-slate-200 transition-all cursor-pointer min-w-[36px]"
              >
                ÷
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('(')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-black text-sm rounded-xl border border-slate-200 transition-all cursor-pointer min-w-[32px]"
              >
                (
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol(')')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-black text-sm rounded-xl border border-slate-200 transition-all cursor-pointer min-w-[32px]"
              >
                )
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={handleApplyCalculation}
                className="px-3 py-1.5 bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] active:scale-95 text-white font-black text-base rounded-xl shadow-md transition-all cursor-pointer ml-auto shrink-0 border border-blue-400/30"
                title="Calculate expression"
              >
                =
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={handleClearAmount}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shrink-0"
              >
                Clear
              </button>
            </div>

            {/* Live Expression Preview / Result Badge */}
            {mathEval.hasOperator && (
              <div className="mt-2">
                {mathEval.isValid ? (
                  <div className="flex items-center justify-between text-xs bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl text-[#07193F] animate-in fade-in">
                    <span className="font-bold flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-[#07193F]" />
                      <span>Result:</span>
                      <strong className="text-[#07193F] text-sm font-black">
                        {mathEval.displayValue} {group.currency}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyCalculation}
                      className="bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] text-white font-black px-2.5 py-0.5 rounded-lg text-[11px] shadow transition-all active:scale-95 cursor-pointer border border-blue-400/30"
                    >
                      Apply
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-800 font-semibold bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
                    Incomplete expression
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expense Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Title / Item Description *
            </label>
            <input
              type="text"
              required
              placeholder={category === 'mess' ? 'e.g., Weekly Groceries & Meat' : 'e.g., Dish Soap & Water Refill'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-[#07193F] focus:ring-2 focus:ring-[#07193F]/20 focus:outline-none"
            />
          </div>

          {/* Paid By Field - Unlocked for Admin, Locked for Regular Members */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Paid By *
              </label>
              {isAdmin ? (
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Admin Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Locked to your account
                </span>
              )}
            </div>

            {isAdmin ? (
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-[#07193F] focus:ring-2 focus:ring-[#07193F]/20 rounded-xl text-xs sm:text-sm font-black text-[#07193F] shadow-2xs cursor-pointer focus:outline-none"
              >
                {group.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.phone || m.mobileNumber || m.email || 'Member'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-black text-[#07193F] flex items-center justify-between shadow-2xs">
                <span>{currentUser?.name || loggedInMember?.name || 'Logged In User'}</span>
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              </div>
            )}
          </div>

          {/* Shared With Members Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Shared With ({selectedMembers.length}/{eligibleMembers.length} members)
              </label>
              <button
                type="button"
                onClick={handleSelectAllMembers}
                className="text-xs font-bold text-[#07193F] hover:underline cursor-pointer"
              >
                {selectedMembers.length === eligibleMembers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {eligibleMembers.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => handleMemberToggle(member.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] text-white border-blue-400/30 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] border shrink-0 ${
                        isSelected ? 'bg-white text-[#071E55] font-black border-white' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                    </div>
                    <span className="truncate">{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expense Date & Attach Receipt Photo Side-by-Side in 1 Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            {/* Expense Date Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#07193F]/20 focus:outline-none ${
                  !dateValidation.isAllowed ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 focus:border-[#07193F]'
                }`}
              />
            </div>

            {/* Attach Receipt Photo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Receipt Photo (Optional)
              </label>
              {receiptImage ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-9 bg-slate-100 flex items-center px-2 justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 truncate">Photo Attached</span>
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    className="text-rose-600 font-black text-xs p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="border border-dashed border-slate-300 hover:border-[#07193F] bg-white rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer transition-colors h-9">
                  <Upload className="w-3.5 h-3.5 text-[#07193F]" />
                  <span className="text-[11px] font-bold text-slate-700">Attach Receipt</span>
                  <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {!dateValidation.isAllowed && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-bold space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-black text-rose-950">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Previous Cycle Expense Entry Locked</span>
              </div>
              <p className="text-[11px]">{dateValidation.errorMessage}</p>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={!dateValidation.isAllowed}
              className={`w-full font-black py-4 rounded-[24px] shadow-lg transition-all text-sm flex items-center justify-center gap-2 active:scale-98 border tracking-wider uppercase cursor-pointer ${
                !dateValidation.isAllowed
                  ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] text-white shadow-blue-950/40 border-blue-400/30'
              }`}
            >
              <span>{dateValidation.isAllowed ? 'SAVE YOUR EXPENSE' : 'ENTRY LOCKED (EXPENSES PAST 7TH DAY)'}</span>
            </button>
          </div>
        </form>
      </GlassContainer>
    </div>
  );
};
