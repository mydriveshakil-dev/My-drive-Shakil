import React, { useState, useEffect } from 'react';
import { Group, ExpenseCategory, UserAuthProfile } from '../types';
import { X, Utensils, ShoppingBag, Upload, Calendar as CalendarIcon, UserCheck, DollarSign, Check, Calculator } from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { evaluateMathExpression } from '../utils/mathEvaluator';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

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

  const [category, setCategory] = useState<ExpenseCategory>('mess');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(loggedInMember?.id || 'm1');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(group.members.map((m) => m.id));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Default to select ALL members when modal opens
      setSelectedMembers(group.members.map((m) => m.id));
      if (loggedInMember) {
        setPaidById(loggedInMember.id);
      }
    }
  }, [isOpen, group.members, loggedInMember]);

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
    if (selectedMembers.length === group.members.length) {
      setSelectedMembers([paidById]);
    } else {
      setSelectedMembers(group.members.map((m) => m.id));
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

  const handleAppendSymbol = (symbol: string) => {
    setAmount((prev) => prev + symbol);
    triggerHaptic(hapticPatterns.click);
  };

  const handleClearAmount = () => {
    setAmount('');
    triggerHaptic(hapticPatterns.click);
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
      <GlassContainer
        variant="modal"
        blur="3xl"
        className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] sm:max-h-[85vh] flex flex-col border border-white/40 my-auto relative box-border shrink-0"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B4A3F] to-[#145C4E] text-white p-5 flex items-center justify-between border-b border-white/20">
          <div>
            <span className="text-xs font-black text-emerald-200 uppercase tracking-wider">
              Shared Room Expense Log
            </span>
            <h2 className="text-xl font-black tracking-tight">Add New Expense</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all border border-white/20 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Category Tabs: Mess Bill vs General Expense */}
          <div className="grid grid-cols-2 gap-2 bg-white/10 border border-white/20 p-1.5 rounded-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setCategory('mess')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                category === 'mess'
                  ? 'bg-[#F9A826] text-[#0B4A3F] shadow-lg font-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Mess Bill</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('general')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                category === 'general'
                  ? 'bg-[#F9A826] text-[#0B4A3F] shadow-lg font-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>General Expense</span>
            </button>
          </div>

          {/* Amount Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Expense Amount ({group.currency}) *
              </label>
              <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-[#F9A826]" />
                Auto-calc (e.g. 10+20+30)
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-200/70 font-black text-base pointer-events-none">
                {group.currency}
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                placeholder="0.00 (e.g. 10+20+30)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleAmountKeyDown}
                onBlur={handleAmountBlur}
                className="w-full pl-16 pr-4 py-3.5 bg-white/10 border border-white/25 rounded-2xl text-2xl font-black text-white placeholder-white/30 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            {/* Quick Math Symbols Keyboard Strip */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-bold text-emerald-200/80 uppercase shrink-0 mr-0.5 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-[#F9A826]" />
                Symbols:
              </span>
              <button
                type="button"
                onClick={() => handleAppendSymbol('+')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-base rounded-xl border border-white/25 transition-all cursor-pointer min-w-[36px]"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleAppendSymbol('-')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-base rounded-xl border border-white/25 transition-all cursor-pointer min-w-[36px]"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleAppendSymbol('*')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-base rounded-xl border border-white/25 transition-all cursor-pointer min-w-[36px]"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => handleAppendSymbol('/')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-base rounded-xl border border-white/25 transition-all cursor-pointer min-w-[36px]"
              >
                ÷
              </button>
              <button
                type="button"
                onClick={() => handleAppendSymbol('(')}
                className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-sm rounded-xl border border-white/25 transition-all cursor-pointer min-w-[32px]"
              >
                (
              </button>
              <button
                type="button"
                onClick={() => handleAppendSymbol(')')}
                className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-sm rounded-xl border border-white/25 transition-all cursor-pointer min-w-[32px]"
              >
                )
              </button>
              <button
                type="button"
                onClick={handleApplyCalculation}
                className="px-3 py-1.5 bg-[#F9A826] hover:bg-[#e59819] active:scale-95 text-[#0B4A3F] font-black text-base rounded-xl shadow-md transition-all cursor-pointer ml-auto shrink-0"
                title="Calculate expression"
              >
                =
              </button>
              <button
                type="button"
                onClick={handleClearAmount}
                className="px-2.5 py-1.5 bg-rose-500/30 hover:bg-rose-500/50 active:scale-95 text-rose-200 font-bold text-xs rounded-xl border border-rose-400/30 transition-all cursor-pointer shrink-0"
              >
                Clear
              </button>
            </div>

            {/* Live Expression Preview / Result Badge */}
            {mathEval.hasOperator && (
              <div className="mt-2">
                {mathEval.isValid ? (
                  <div className="flex items-center justify-between text-xs bg-amber-400/20 border border-amber-400/40 px-3 py-1.5 rounded-xl text-amber-100 backdrop-blur-md animate-in fade-in">
                    <span className="font-bold flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-amber-300" />
                      <span>Result:</span>
                      <strong className="text-white text-sm font-black">
                        {mathEval.displayValue} {group.currency}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyCalculation}
                      className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-2.5 py-0.5 rounded-lg text-[11px] shadow transition-all active:scale-95 cursor-pointer"
                    >
                      Press Enter or Tap
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-200 font-semibold bg-rose-950/60 border border-rose-500/40 px-3 py-1 rounded-xl">
                    Incomplete expression (e.g. 10+20+30)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expense Title */}
          <div>
            <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5">
              Title / Item Description *
            </label>
            <input
              type="text"
              required
              placeholder={category === 'mess' ? 'e.g., Weekly Groceries & Meat' : 'e.g., Dish Soap & Water Refill'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-xl text-sm font-semibold text-white placeholder-white/30 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          {/* Paid By Box - Restricted ONLY to Logged In User */}
          <div>
            <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Paid By (Who paid out of pocket?) *</span>
              <span className="text-[10px] text-amber-300 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Logged In User
              </span>
            </label>
            <div className="w-full px-4 py-3 bg-slate-900/90 border border-amber-400/50 rounded-xl text-sm font-bold text-amber-300 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#F9A826] text-[#0B4A3F] flex items-center justify-center font-black text-xs shadow-md shrink-0">
                  {loggedInMember?.avatar || (currentUser?.name || 'US').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-white text-sm font-black">
                  {currentUser?.name || loggedInMember?.name || 'Logged In User'}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30 uppercase tracking-wider shrink-0">
                Logged In User
              </span>
            </div>
          </div>

          {/* Shared With Members Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Shared With ({selectedMembers.length}/{group.members.length} members)
              </label>
              <button
                type="button"
                onClick={handleSelectAllMembers}
                className="text-xs font-bold text-[#F9A826] hover:underline"
              >
                {selectedMembers.length === group.members.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.members.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => handleMemberToggle(member.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left backdrop-blur-md ${
                      isSelected
                        ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200'
                        : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-[#F9A826] text-[#0B4A3F] font-black' : 'bg-white/15 text-white/60'
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
            <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5">
              Expense Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-xl text-sm font-semibold text-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Note / Memo */}
          <div>
            <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5">
              Note / Vendor details (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bought from Lulu Hypermarket or Nesto"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/25 rounded-xl text-xs font-medium text-white placeholder-white/30 focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none"
            ></textarea>
          </div>

          {/* Receipt Upload (Optional Image) */}
          <div>
            <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5">
              Attach Receipt Photo (Optional)
            </label>

            {receiptImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/30 h-32 bg-black/40">
                <img src={receiptImage} alt="Receipt Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setReceiptImage(null)}
                  className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full shadow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/30 hover:border-amber-400 bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <Upload className="w-6 h-6 text-emerald-200/60 mb-1" />
                <span className="text-xs font-bold text-white">Click to upload receipt photo</span>
                <span className="text-[10px] text-emerald-200/60">PNG, JPG up to 5MB</span>
                <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black py-4 rounded-2xl shadow-xl transition-all text-sm flex items-center justify-center gap-2 active:scale-98 border border-white/30 tracking-wider uppercase"
            >
              <span>SAVE YOUR EXPENSE</span>
            </button>
          </div>
        </form>
      </GlassContainer>
    </div>
  );
};
