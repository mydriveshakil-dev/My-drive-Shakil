import React, { useState, useEffect, useRef } from 'react';
import { Group, ExpenseCategory, UserAuthProfile } from '../types';
import { X, Utensils, ShoppingBag, Upload, Calendar as CalendarIcon, UserCheck, DollarSign, Check, Calculator, AlertCircle } from 'lucide-react';
import { GlassContainer } from './GlassContainer';
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
      (currentUser?.mobileNumber && (m.phone?.includes(currentUser.mobileNumber.slice(-7)) || m.mobileNumber?.includes(currentUser.mobileNumber.slice(-7)))) ||
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

  const groupMembersJoined = group.members.map((m) => m.id).join(',');

  useEffect(() => {
    if (isOpen) {
      setSelectedMembers(eligibleMembers.map((m) => m.id));
      if (loggedInMember) {
        setPaidById(loggedInMember.id);
      }
    }
  }, [isOpen, category, groupMembersJoined, loggedInMember?.id]);

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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overflow-x-hidden max-w-full">
      <GlassContainer
        variant="modal"
        blur="3xl"
        className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] sm:max-h-[85vh] flex flex-col border-2 border-black my-auto relative box-border shrink-0 bg-white text-slate-900 max-w-full"
      >
        {/* Header */}
        <div className="bg-black text-white p-5 flex items-center justify-between border-b-2 border-black shrink-0">
          <div>
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Shared Room Expense Log
            </span>
            <h2 className="text-xl font-black tracking-tight text-white">Add New Expense</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all border border-white active:scale-90 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5 overflow-y-auto overflow-x-hidden flex-1 w-full box-border">
          {/* Category Tabs: Mess Bill vs General Expense */}
          {(isMessPermitted || isGeneralPermitted) ? (
            <div className={`grid ${isMessPermitted && isGeneralPermitted ? 'grid-cols-2' : 'grid-cols-1'} gap-2 bg-slate-100 border border-black p-1.5 rounded-2xl`}>
              {isMessPermitted && (
                <button
                  type="button"
                  onClick={() => setCategory('mess')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    category === 'mess'
                      ? 'bg-black text-white shadow-md font-black border border-black'
                      : 'bg-white text-black border border-black hover:bg-slate-200'
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
                      ? 'bg-black text-white shadow-md font-black border border-black'
                      : 'bg-white text-black border border-black hover:bg-slate-200'
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
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Expense Amount ({group.currency}) *
              </label>
              <span className="text-[10px] text-slate-700 font-semibold flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-slate-900" />
                Auto-calc (e.g. 10+20+30)
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 font-black text-base pointer-events-none">
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
                className="w-full pl-16 pr-4 py-3.5 bg-white border-2 border-black rounded-2xl text-2xl font-black text-slate-950 placeholder-slate-400 focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>

            {/* Quick Math Symbols Keyboard Strip */}
            <div className="flex items-center gap-1.5 mt-2 w-full max-w-full overflow-x-auto pb-1 scrollbar-none touch-pan-x">
              <span className="text-slate-800 shrink-0 mr-0.5 flex items-center">
                <Calculator className="w-3.5 h-3.5 text-black" />
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('+')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-black font-black text-base rounded-xl border border-black transition-all cursor-pointer min-w-[36px]"
              >
                +
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('-')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-black font-black text-base rounded-xl border border-black transition-all cursor-pointer min-w-[36px]"
              >
                -
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('*')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-black font-black text-base rounded-xl border border-black transition-all cursor-pointer min-w-[36px]"
              >
                ×
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('/')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-black font-black text-base rounded-xl border border-black transition-all cursor-pointer min-w-[36px]"
              >
                ÷
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol('(')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-black font-black text-sm rounded-xl border border-black transition-all cursor-pointer min-w-[32px]"
              >
                (
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleAppendSymbol(')')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-black font-black text-sm rounded-xl border border-black transition-all cursor-pointer min-w-[32px]"
              >
                )
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={handleApplyCalculation}
                className="px-3 py-1.5 bg-black hover:bg-slate-800 active:scale-95 text-white font-black text-base rounded-xl shadow-md transition-all cursor-pointer ml-auto shrink-0 border border-black"
                title="Calculate expression"
              >
                =
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={handleClearAmount}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-black font-bold text-xs rounded-xl border border-black transition-all cursor-pointer shrink-0"
              >
                Clear
              </button>
            </div>

            {/* Live Expression Preview / Result Badge */}
            {mathEval.hasOperator && (
              <div className="mt-2">
                {mathEval.isValid ? (
                  <div className="flex items-center justify-between text-xs bg-slate-100 border border-black px-3 py-1.5 rounded-xl text-black animate-in fade-in">
                    <span className="font-bold flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-black" />
                      <span>Result:</span>
                      <strong className="text-black text-sm font-black">
                        {mathEval.displayValue} {group.currency}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyCalculation}
                      className="bg-black hover:bg-slate-800 text-white font-black px-2.5 py-0.5 rounded-lg text-[11px] shadow transition-all active:scale-95 cursor-pointer border border-black"
                    >
                      Press Enter or Tap
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-800 font-semibold bg-rose-50 border border-black px-3 py-1 rounded-xl">
                    Incomplete expression (e.g. 10+20+30)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expense Title */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Title / Item Description *
            </label>
            <input
              type="text"
              required
              placeholder={category === 'mess' ? 'e.g., Weekly Groceries & Meat' : 'e.g., Dish Soap & Water Refill'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-black rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          {/* Paid By Box - Restricted ONLY to Logged In User */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Paid By (Who paid out of pocket?) *</span>
              <span className="text-[10px] text-white font-semibold bg-black px-2 py-0.5 rounded-full border border-black">
                Logged In User
              </span>
            </label>
            <div className="w-full px-4 py-3 bg-white border-2 border-black rounded-xl text-sm font-bold text-slate-900 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-black text-xs shadow-md shrink-0 border border-black">
                  {loggedInMember?.avatar || (currentUser?.name || 'US').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-slate-900 text-sm font-black">
                  {currentUser?.name || loggedInMember?.name || 'Logged In User'}
                </span>
              </div>
              <span className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full font-bold border border-black uppercase tracking-wider shrink-0">
                Logged In User
              </span>
            </div>
          </div>

          {/* Shared With Members Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Shared With ({selectedMembers.length}/{eligibleMembers.length} members)
              </label>
              <button
                type="button"
                onClick={handleSelectAllMembers}
                className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
              >
                {selectedMembers.length === eligibleMembers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {eligibleMembers.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => handleMemberToggle(member.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-slate-700 border-black hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] border ${
                        isSelected ? 'bg-white text-black font-black border-white' : 'bg-slate-100 text-slate-800 border-black'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : member.avatar}
                    </div>
                    <span className="truncate">{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Expense Date *</span>
              {currentUser?.role === 'admin' && (
                <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full border border-black">
                  Admin (No Date Limit)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-black focus:outline-none ${
                  !dateValidation.isAllowed ? 'border-rose-600 bg-rose-50/50' : 'border-black'
                }`}
              />
            </div>

            {!dateValidation.isAllowed && (
              <div className="mt-2 p-3 bg-rose-50 border-2 border-rose-600 rounded-xl text-rose-900 text-xs font-bold space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-black text-rose-950">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Previous Cycle Expense Entry Locked</span>
                </div>
                <p>{dateValidation.errorMessage}</p>
              </div>
            )}
          </div>

          {/* Note / Memo */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Note / Vendor details (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bought from Lulu Hypermarket or Nesto"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-black rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-black focus:outline-none resize-none"
            ></textarea>
          </div>

          {/* Receipt Upload (Optional Image) */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Attach Receipt Photo (Optional)
            </label>

            {receiptImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-black h-32 bg-slate-100">
                <img src={receiptImage} alt="Receipt Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setReceiptImage(null)}
                  className="absolute top-2 right-2 bg-black text-white p-1 rounded-full shadow cursor-pointer border border-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-black hover:bg-slate-100 bg-white rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <Upload className="w-6 h-6 text-black mb-1" />
                <span className="text-xs font-bold text-slate-900">Click to upload receipt photo</span>
                <span className="text-[10px] text-slate-600">PNG, JPG up to 5MB</span>
                <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={!dateValidation.isAllowed}
              className={`w-full font-black py-4 rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2 active:scale-98 border-2 border-black tracking-wider uppercase cursor-pointer ${
                !dateValidation.isAllowed
                  ? 'bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed opacity-70'
                  : 'bg-black hover:bg-slate-800 text-white'
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
