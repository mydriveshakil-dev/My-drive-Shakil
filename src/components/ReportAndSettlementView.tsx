import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Group, Expense, UtilityBill, RentContribution } from '../types';
import { calculateSettlement } from '../utils/settlementCalculator';
import { GlassContainer } from './GlassContainer';
import {
  PieChart as ChartIcon,
  FileText,
  Printer,
  Share2,
  CheckCircle,
  ArrowRight,
  User,
  Calendar,
  DollarSign,
  Info,
  CheckSquare,
  Square,
  Sparkles,
  X,
  Check,
  ShieldCheck,
  Building2,
  Receipt,
  Download,
  Loader2,
} from 'lucide-react';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';

interface ReportAndSettlementViewProps {
  group: Group;
  expenses: Expense[];
  utilities: UtilityBill[];
  rent: RentContribution;
  onSaveSettlement: () => void;
  preferredCurrency?: string;
  customRates?: Record<string, number>;
}

export const ReportAndSettlementView: React.FC<ReportAndSettlementViewProps> = ({
  group,
  expenses,
  utilities,
  rent,
  onSaveSettlement,
  preferredCurrency = 'USD',
  customRates,
}) => {
  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState('2026-07-31');
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Category filter checkboxes
  const [includeCategories, setIncludeCategories] = useState({
    mess: true,
    general: true,
    utilities: true,
    rent: true,
  });

  const settlementResult = calculateSettlement(
    group.members,
    expenses,
    utilities,
    rent,
    includeCategories
  );

  const toggleCategory = (key: keyof typeof includeCategories) => {
    setIncludeCategories({
      ...includeCategories,
      [key]: !includeCategories[key],
    });
  };

  const handlePrintPdf = async () => {
    const element = document.getElementById('pdf-report-document');
    if (!element) {
      window.print();
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const opt = {
        margin: 6,
        filename: `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF export error, using fallback print():', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareReport = async () => {
    const summaryText = `📋 *${group.name} - Settlement Report*\n📅 Period: ${fromDate} to ${toDate}\n\n💰 Grand Total: ${settlementResult.grandTotalExpenses.toFixed(2)} ${group.currency}\n🍲 Daily Meal Rate: ${settlementResult.dailyMealRate.toFixed(2)} ${group.currency}/day\n\n*Settlement Transactions:*\n${
      settlementResult.settlementFlows.length > 0
        ? settlementResult.settlementFlows
            .map((f) => `• ${f.fromMemberName} pays ${f.toMemberName}: ${f.amount.toFixed(2)} ${group.currency}`)
            .join('\n')
        : 'All balances cleared!'
    }`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${group.name} Settlement Report`,
          text: summaryText,
        });
      } catch (err) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(summaryText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }
    } else {
      await navigator.clipboard.writeText(summaryText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner */}
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border border-white/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <span className="text-xs font-black text-emerald-200 uppercase tracking-wider bg-white/15 px-3.5 py-1 rounded-full border border-white/20 backdrop-blur-md">
            Settlement Engine & Dynamic Balance
          </span>
          <h2 className="text-2xl font-black mt-2 text-white drop-shadow-sm">Report & Member Settlement</h2>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            Exact meal rates, individual spending balances, and simplified debt transfers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPdfPreviewOpen(true)}
            className="bg-white/15 hover:bg-white/25 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 border border-white/20 transition-all active:scale-95 backdrop-blur-md cursor-pointer shadow-lg"
          >
            <FileText className="w-4 h-4 text-[#F9A826]" />
            <span>Export to PDF</span>
          </button>

          <button
            onClick={onSaveSettlement}
            className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 border border-white/30 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 stroke-[3]" />
            <span>Finalize Settlement</span>
          </button>
        </div>
      </GlassContainer>

      {/* Date Picker & Category Checkbox Filters */}
      <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/15 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Calendar className="w-4 h-4 text-[#F9A826]" />
            <span>Settlement Period Range:</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 bg-white/10 border border-white/25 rounded-xl font-semibold text-white focus:outline-none"
            />
            <span className="text-emerald-200/60">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 bg-white/10 border border-white/25 rounded-xl font-semibold text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Category Checkboxes */}
        <div>
          <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block mb-2">
            Include Categories in Calculation:
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { key: 'mess', label: 'Mess Expenses' },
              { key: 'general', label: 'General Expenses' },
              { key: 'utilities', label: 'Utilities (DEWA & WiFi)' },
              { key: 'rent', label: 'Landlord Rent' },
            ].map(({ key, label }) => {
              const isChecked = includeCategories[key as keyof typeof includeCategories];
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key as keyof typeof includeCategories)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all backdrop-blur-md ${
                    isChecked
                      ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
                      : 'bg-white/5 border-white/15 text-white/50'
                  }`}
                >
                  {isChecked ? <CheckSquare className="w-4 h-4 text-[#F9A826]" /> : <Square className="w-4 h-4" />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassContainer>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassContainer variant="card" className="p-4 border border-emerald-400/30 text-white shadow-xl">
          <span className="text-[10px] font-bold text-emerald-300 uppercase">Total Mess Bill</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.totalMessExpenses}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-white"
            />
          </div>
          <span className="text-[10px] text-emerald-200 block mt-1">Rate: ~{settlementResult.dailyMealRate.toFixed(2)} AED/day</span>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-amber-400/30 text-white shadow-xl">
          <span className="text-[10px] font-bold text-amber-300 uppercase">General Expenses</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.totalGeneralExpenses}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-white"
            />
          </div>
          <span className="text-[10px] text-amber-200 block mt-1">Equal split</span>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-blue-400/30 text-white shadow-xl">
          <span className="text-[10px] font-bold text-blue-300 uppercase">Utilities & Rent</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.totalUtilities + settlementResult.totalRent}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-white"
            />
          </div>
          <span className="text-[10px] text-blue-200 block mt-1">DEWA, WiFi, Rent</span>
        </GlassContainer>

        <GlassContainer variant="emerald" className="p-4 border border-white/30 text-white shadow-xl">
          <span className="text-[10px] font-bold text-[#F9A826] uppercase">Grand Total</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.grandTotalExpenses}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-white"
            />
          </div>
          <span className="text-[10px] text-emerald-200 block mt-1">{group.members.length} Members</span>
        </GlassContainer>
      </div>

      {/* SECTION 1: Member-wise Calculation Table */}
      <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-[#F9A826]" />
            Member-wise Calculation Breakdown
          </h3>
          <span className="text-xs text-emerald-200 font-medium">
            Mess Meal Rate: <strong className="text-[#F9A826]">{settlementResult.dailyMealRate.toFixed(2)} AED/day</strong>
          </span>
        </div>

        {/* Mobile Responsive Member Calculation Cards (100% width, no horizontal scroll) */}
        <div className="block sm:hidden space-y-3">
          {settlementResult.memberSummaries.map((ms) => {
            const isOverpaid = ms.balance >= 0;
            return (
              <div
                key={ms.memberId}
                className="bg-white/10 p-3.5 rounded-2xl border border-white/15 backdrop-blur-md space-y-2.5 text-xs text-white"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#F9A826]" />
                    {ms.memberName}
                  </span>
                  <span className="bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-400/30">
                    {ms.daysPresent} Days Present
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-black/20 p-2 rounded-xl border border-white/10">
                    <span className="text-emerald-200/80 block text-[10px] font-medium">Actual Share</span>
                    <span className="font-extrabold text-white">{ms.totalActualExpense.toFixed(2)} AED</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-xl border border-white/10">
                    <span className="text-emerald-200/80 block text-[10px] font-medium">Amount Paid</span>
                    <span className="font-extrabold text-[#F9A826]">{ms.totalAmountSpent.toFixed(2)} AED</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-200 font-semibold">Final Status:</span>
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                      isOverpaid
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-400/40'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-400/40'
                    }`}
                  >
                    {isOverpaid ? `+${ms.balance.toFixed(2)} AED (Gets Back)` : `${ms.balance.toFixed(2)} AED (Owes)`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/10 text-emerald-200 uppercase tracking-wider font-bold border-b border-white/20">
                <th className="py-3 px-3">Member</th>
                <th className="py-3 px-2 text-center">Days Present</th>
                <th className="py-3 px-2 text-right">Actual Expense Share</th>
                <th className="py-3 px-2 text-right">Amount Paid</th>
                <th className="py-3 px-3 text-right">Final Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-medium text-white">
              {settlementResult.memberSummaries.map((ms) => {
                const isOverpaid = ms.balance >= 0;

                return (
                  <tr key={ms.memberId} className="hover:bg-white/10 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      <span>{ms.memberName}</span>
                    </td>

                    <td className="py-3 px-2 text-center font-semibold text-emerald-100">
                      {ms.daysPresent} days
                    </td>

                    <td className="py-3 px-2 text-right font-semibold text-emerald-100">
                      {ms.totalActualExpense.toFixed(2)} AED
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-[#F9A826]">
                      {ms.totalAmountSpent.toFixed(2)} AED
                    </td>

                    <td className="py-3 px-3 text-right font-extrabold">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-xl text-xs ${
                          isOverpaid
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-400/40'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-400/40'
                        }`}
                      >
                        {isOverpaid ? `+${ms.balance.toFixed(2)} AED (Gets Back)` : `${ms.balance.toFixed(2)} AED (Owes)`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassContainer>

      {/* SECTION 2: Settlement Flow ("Who needs to pay whom") */}
      <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F9A826]" />
              Simplified Debt Settlement Flow
            </h3>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Minimum number of transactions needed to clear all room debts
            </p>
          </div>

          <span className="bg-emerald-950/70 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/40">
            {settlementResult.settlementFlows.length} Direct Payments
          </span>
        </div>

        {settlementResult.settlementFlows.length > 0 ? (
          <div className="space-y-3">
            {settlementResult.settlementFlows.map((flow) => (
              <div
                key={flow.id}
                className="bg-white/10 border border-white/25 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 hover:border-white/50 transition-all text-white backdrop-blur-2xl shadow-lg"
              >
                {/* Payer (Debtor) */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-400/30 font-bold flex items-center justify-center shrink-0">
                    {flow.fromMemberName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                      Payer (Owes)
                    </span>
                    <h4 className="text-sm font-bold text-white">{flow.fromMemberName}</h4>
                  </div>
                </div>

                {/* Arrow & Amount */}
                <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-2xl border border-white/30 backdrop-blur-xl">
                  <span className="text-xs text-emerald-100/80 font-medium">pays</span>
                  <ArrowRight className="w-4 h-4 text-[#F9A826]" />
                  <DualCurrencyDisplay
                    amount={flow.amount}
                    baseCurrency={group.currency}
                    preferredCurrency={preferredCurrency}
                    customRates={customRates}
                    layout="pill"
                    baseClassName="text-base font-black text-[#F9A826]"
                  />
                </div>

                {/* Receiver (Creditor) */}
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block text-right sm:text-left">
                      Receiver (Gets Back)
                    </span>
                    <h4 className="text-sm font-bold text-white">{flow.toMemberName}</h4>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold flex items-center justify-center shrink-0">
                    {flow.toMemberName.substring(0, 2).toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-emerald-950/40 rounded-3xl border border-emerald-400/30 p-4">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">All Expenses Settled Perfectly!</h4>
            <p className="text-xs text-emerald-200 mt-1">No member owes money to another member in this cycle.</p>
          </div>
        )}
      </GlassContainer>

      {/* PDF REPORT PREVIEW MODAL */}
      {isPdfPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-between p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          {/* Top Control Header Bar */}
          <div className="w-full max-w-4xl bg-slate-900/90 border border-white/20 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-white backdrop-blur-2xl shadow-2xl shrink-0 my-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F9A826] text-[#0B4A3F] font-black flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>Settlement Report PDF Preview</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    A4 Statement
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-200/80">
                  {group.name} • Period: {fromDate} to {toDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Save / Download PDF Button */}
              <button
                type="button"
                onClick={handlePrintPdf}
                disabled={isGeneratingPdf}
                className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-4 py-2 sm:py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Downloading PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShareReport}
                className="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-2 sm:py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-white/20 transition-all active:scale-95 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-amber-300" />
                    <span>Share</span>
                  </>
                )}
              </button>

              {/* Close Modal Button */}
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/15"
                title="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PDF Preview Document Container (A4 Printable Document Sheet) */}
          <div className="w-full max-w-4xl my-auto py-4 overflow-x-auto">
            <div
              id="pdf-report-document"
              className="bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 max-w-3xl w-full mx-auto space-y-6 text-xs font-sans border border-slate-200"
            >
              {/* Header Stamp & Title */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B4A3F] text-[#F9A826] font-black flex items-center justify-center text-xl shadow-md border border-slate-200 shrink-0">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                      ROOM EXPENSE SUITE
                    </h1>
                    <p className="text-xs text-emerald-800 font-extrabold uppercase">
                      {group.name} • SETTLEMENT STATEMENT
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      UNITED ARAB EMIRATES • MESS EXPENSE MANAGEMENT SYSTEM
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-[11px] font-medium text-slate-600">
                  <p className="font-bold text-slate-900 text-xs">Group: {group.name}</p>
                  <p>Settlement Period: <strong className="text-emerald-700">{fromDate}</strong> to <strong className="text-emerald-700">{toDate}</strong></p>
                  <p>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
              </div>

              {/* Key Summary Totals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Total Mess Expense</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {settlementResult.totalMessExpenses.toFixed(2)} {group.currency}
                  </div>
                  <span className="text-[10px] text-slate-500">Rate: {settlementResult.dailyMealRate.toFixed(2)} {group.currency}/day</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">General Expense</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {settlementResult.totalGeneralExpenses.toFixed(2)} {group.currency}
                  </div>
                  <span className="text-[10px] text-slate-500">Shared equally</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Utilities & Rent</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {(settlementResult.totalUtilities + settlementResult.totalRent).toFixed(2)} {group.currency}
                  </div>
                  <span className="text-[10px] text-slate-500">DEWA, WiFi, Rent</span>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Grand Total</span>
                  <div className="text-base font-black text-emerald-950 mt-0.5">
                    {settlementResult.grandTotalExpenses.toFixed(2)} {group.currency}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold">{group.members.length} Members</span>
                </div>
              </div>

              {/* Member-wise Calculation Table */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span>1. Member-wise Calculation Breakdown</span>
                  <span className="text-slate-500 font-normal">Daily Rate: {settlementResult.dailyMealRate.toFixed(2)} {group.currency}/day</span>
                </h3>

                <table className="w-full text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                      <th className="p-2 border border-slate-200">Member</th>
                      <th className="p-2 border border-slate-200 text-center">Days Present</th>
                      <th className="p-2 border border-slate-200 text-right">Actual Share</th>
                      <th className="p-2 border border-slate-200 text-right">Amount Paid</th>
                      <th className="p-2 border border-slate-200 text-right">Final Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {settlementResult.memberSummaries.map((ms) => {
                      const isOverpaid = ms.balance >= 0;
                      return (
                        <tr key={ms.memberId} className="even:bg-slate-50">
                          <td className="p-2 border border-slate-200 font-bold text-slate-900">
                            {ms.memberName}
                          </td>
                          <td className="p-2 border border-slate-200 text-center text-slate-700">
                            {ms.daysPresent} days
                          </td>
                          <td className="p-2 border border-slate-200 text-right text-slate-700">
                            {ms.totalActualExpense.toFixed(2)} {group.currency}
                          </td>
                          <td className="p-2 border border-slate-200 text-right font-bold text-amber-700">
                            {ms.totalAmountSpent.toFixed(2)} {group.currency}
                          </td>
                          <td className="p-2 border border-slate-200 text-right font-black">
                            <span className={isOverpaid ? 'text-emerald-700' : 'text-rose-700'}>
                              {isOverpaid
                                ? `+${ms.balance.toFixed(2)} ${group.currency} (Gets Back)`
                                : `${ms.balance.toFixed(2)} ${group.currency} (Owes)`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Simplified Debt Settlement Flow Table */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 pb-1 border-b border-slate-200">
                  2. Simplified Debt Settlement Transactions
                </h3>

                {settlementResult.settlementFlows.length > 0 ? (
                  <div className="space-y-1.5">
                    {settlementResult.settlementFlows.map((flow) => (
                      <div
                        key={flow.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-rose-700">{flow.fromMemberName} (Payer)</span>
                        <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                          <span>pays</span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-slate-900 font-black px-2 py-0.5 bg-amber-100 rounded border border-amber-300">
                            {flow.amount.toFixed(2)} {group.currency}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-700">{flow.toMemberName} (Receiver)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 font-bold p-2 bg-emerald-50 rounded border border-emerald-200">
                    ✓ All member balances are fully settled in this cycle.
                  </p>
                )}
              </div>

              {/* Document Signatures & Stamp */}
              <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-[11px] text-slate-500">
                <div>
                  <p className="font-bold text-slate-800">Verified & Approved By:</p>
                  <p className="mt-6 border-t border-slate-300 pt-1 font-semibold">Room Manager Signature</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-black text-[10px] uppercase">
                    OFFICIAL MESS AUDIT STAMP
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Generated by Room Suite Portal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
