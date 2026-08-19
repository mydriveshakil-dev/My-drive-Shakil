import React, { useState, useEffect, useRef } from 'react';
import { Group, ExpenseCategory, UserAuthProfile } from '../types';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { isPhoneMatch } from '../lib/firebase';
import { evaluateMathExpression } from '../utils/mathEvaluator';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { isCategoryPermittedForMember, isCategoryPermittedForUser } from '../utils/permissionUtils';
import { MemberAvatar } from './MemberAvatar';

export interface AddExpenseViewProps {
  group: Group;
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

export const AddExpenseView: React.FC<AddExpenseViewProps> = ({
  group,
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMessPermitted && isGeneralPermitted && category === 'mess') {
      setCategory('general');
    }
  }, [isMessPermitted, isGeneralPermitted, category]);

  const isAdmin = currentUser?.role === 'admin';
  const groupMembersJoined = group.members.map((m) => m.id).join(',');

  useEffect(() => {
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
  }, [category, groupMembersJoined, loggedInMember?.id, isAdmin]);

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
        triggerHaptic(hapticPatterns.success);
      };
      reader.readAsDataURL(file);
    }
    // reset input value so re-selecting same photo triggers onChange
    e.target.value = '';
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
    const currentMonthIdx = now.getMonth();
    const currentDay = now.getDate();

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

  // Close when clicking outside the card
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        triggerHaptic(hapticPatterns.click);
        onClose();
      }
    };

    // Small delay prevents immediate close if opened via a button click/tap
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 150);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

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

    // Reset and return
    setTitle('');
    setAmount('');
    setNote('');
    setReceiptImage(null);
    onClose();
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-6 animate-in fade-in duration-200">
      {/* Main Form Card */}
      <div ref={cardRef} className="neu-upper rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col">
        {/* Main Page Header Banner - Dark Navy Theme */}
        <div className="bg-[#07193F] text-white px-3.5 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between shrink-0 gap-2 border-b border-blue-950/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white leading-tight truncate">
                Add New Expense (নতুন খরচ যুক্ত করুন)
              </h1>
              <span className="text-[10px] font-bold text-blue-200 bg-[#0B2A66] px-2 py-0.5 rounded-full inline-block mt-0.5 truncate max-w-[150px] border border-blue-400/20">
                {group.name}
              </span>
            </div>
          </div>

          {/* Header Right: Paid by (left of Cancel) + Cancel Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-white/10 hover:bg-white/15 rounded-lg px-2 py-1 text-xs text-white transition-colors border border-white/10">
              <span className="text-[10px] font-bold text-blue-200 uppercase">Paid by:</span>
              {isAdmin ? (
                <select
                  value={paidById}
                  onChange={(e) => {
                    setPaidById(e.target.value);
                    triggerHaptic(hapticPatterns.click);
                  }}
                  className="bg-transparent text-white font-black text-xs focus:outline-none cursor-pointer [&>option]:text-slate-900 [&>option]:bg-white max-w-[95px] sm:max-w-[125px] truncate"
                >
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-black text-white text-xs max-w-[85px] sm:max-w-[115px] truncate">
                  {currentUser?.name || loggedInMember?.name || 'User'}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onClose();
              }}
              className="text-xs font-bold text-blue-200 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 transition-all cursor-pointer shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Form Body - Engineered to fit screens cleanly */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-4 w-full box-border">
          {/* 1. Row: Expense Amount (50%) & Expense Date (50%) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 items-start">
            {/* Left 50%: Expense Amount */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span className="uppercase tracking-wider truncate">Amount ({group.currency}) *</span>
                {mathEval.hasOperator && (
                  <span className="text-slate-950 font-black text-[10px]">
                    = {mathEval.isValid ? `${mathEval.displayValue}` : '...'}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 font-black text-xs sm:text-sm pointer-events-none">
                  {group.currency}
                </span>
                <input
                  ref={amountInputRef}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={handleAmountKeyDown}
                  onBlur={handleAmountBlur}
                  className="w-full pl-11 pr-2.5 py-2 neu-lower-sm rounded-xl text-base sm:text-lg font-black text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Right 50%: Expense Date */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span className="uppercase tracking-wider truncate">Expense Date *</span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-2.5 py-2 neu-lower-sm rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none ${
                    !dateValidation.isAllowed ? 'text-rose-600' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Quick Math Buttons: +, -, ×, ÷, =, Clear (Full Width Row) */}
          <div className="flex items-center gap-1 sm:gap-1.5 pt-0.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAppendSymbol('+')}
              className="flex-1 py-1.5 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs sm:text-sm rounded-lg cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAppendSymbol('-')}
              className="flex-1 py-1.5 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs sm:text-sm rounded-lg cursor-pointer"
            >
              -
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAppendSymbol('*')}
              className="flex-1 py-1.5 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs sm:text-sm rounded-lg cursor-pointer"
            >
              ×
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAppendSymbol('/')}
              className="flex-1 py-1.5 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs sm:text-sm rounded-lg cursor-pointer"
            >
              ÷
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleApplyCalculation}
              className="flex-1 py-1.5 bg-[#0052FF] hover:bg-[#0047E0] active:scale-95 text-white font-black text-xs sm:text-sm rounded-lg cursor-pointer shadow-sm"
              title="Calculate"
            >
              =
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClearAmount}
              className="px-2.5 sm:px-3 py-1.5 neu-upper-btn active:scale-95 text-slate-600 font-bold text-[11px] sm:text-xs rounded-lg cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* 2. Title / Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Title / Item Description *
            </label>
            <input
              type="text"
              required
              placeholder={category === 'mess' ? 'e.g., Weekly Groceries & Meat' : 'e.g., Dish Soap & Water Refill'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 neu-lower-sm rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* 5. Shared With Members */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Shared With ({selectedMembers.length}/{eligibleMembers.length})
              </label>
              <button
                type="button"
                onClick={handleSelectAllMembers}
                className="text-[10px] font-bold text-slate-900 hover:underline cursor-pointer"
              >
                {selectedMembers.length === eligibleMembers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-28 overflow-y-auto p-1 neu-lower-sm rounded-xl">
              {eligibleMembers.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => handleMemberToggle(member.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all text-left cursor-pointer truncate ${
                      isSelected
                        ? 'bg-black text-white shadow-xs'
                        : 'neu-upper-sm text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center text-[8px] shrink-0 ${
                        isSelected ? 'bg-white text-black font-black' : 'bg-slate-300 text-slate-600'
                      }`}
                    >
                      {isSelected ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : null}
                    </div>
                    <MemberAvatar
                      name={member.name}
                      avatar={member.avatar}
                      size="xs"
                      className="w-4 h-4 text-[7px] shrink-0"
                    />
                    <span className="truncate">{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Receipt Attachment - 2 Side-by-Side Icon Buttons: Camera & Gallery */}
          <div className="space-y-1.5">
            {/* Hidden Native File Inputs linked via htmlFor */}
            <input
              id="expense-camera-input"
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptUpload}
              className="sr-only"
            />
            <input
              id="expense-gallery-input"
              ref={galleryInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp"
              onChange={handleReceiptUpload}
              className="sr-only"
            />

            {/* 2 Icon-Only Buttons in 1 Line */}
            <div className="grid grid-cols-2 gap-2">
              {/* Camera Button (Take Photo) */}
              <label
                htmlFor="expense-camera-input"
                onClick={() => triggerHaptic(hapticPatterns.click)}
                title="Camera (Take Photo)"
                aria-label="Camera (Take Photo)"
                className="h-10 neu-upper-btn active:scale-95 rounded-xl flex items-center justify-center text-slate-900 transition-all cursor-pointer group select-none"
              >
                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform pointer-events-none" />
              </label>

              {/* Gallery Button (Photo Library) */}
              <label
                htmlFor="expense-gallery-input"
                onClick={() => triggerHaptic(hapticPatterns.click)}
                title="Gallery (Photo Library)"
                aria-label="Gallery (Photo Library)"
                className="h-10 neu-upper-btn active:scale-95 rounded-xl flex items-center justify-center text-slate-900 transition-all cursor-pointer group select-none"
              >
                <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform pointer-events-none" />
              </label>
            </div>

            {/* Receipt Preview Strip if Attached */}
            {receiptImage && (
              <div className="rounded-xl overflow-hidden neu-upper-sm p-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={receiptImage}
                    alt="Receipt Preview"
                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                  />
                  <span className="text-[11px] font-bold text-emerald-800 truncate">
                    Receipt image attached
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(hapticPatterns.click);
                    setReceiptImage(null);
                  }}
                  className="p-1 text-rose-600 hover:text-rose-800 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Remove Receipt"
                  aria-label="Remove Receipt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Date Validation Warning if Locked */}
          {!dateValidation.isAllowed && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] font-bold space-y-0.5">
              <div className="flex items-center gap-1 font-black text-rose-950">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Entry Locked</span>
              </div>
              <p className="text-[10px]">{dateValidation.errorMessage}</p>
            </div>
          )}

          {/* 7. Save Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={!dateValidation.isAllowed}
              className={`w-full font-black py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98 tracking-wider uppercase cursor-pointer ${
                !dateValidation.isAllowed
                  ? 'neu-lower-sm text-slate-400 cursor-not-allowed opacity-70'
                  : 'bg-[#07193F] hover:bg-[#0B2A66] text-white shadow-md'
              }`}
            >
              <span>{dateValidation.isAllowed ? 'SAVE EXPENSE' : 'ENTRY LOCKED'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
