import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import uaeMessLogo from '../assets/images/uae_mess_logo_1785022712689.jpg';
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
  MessageSquare,
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
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const cachedPdfFileRef = useRef<File | null>(null);

  // Category filter checkboxes (Room rent is excluded from settlement breakdown as per landlord rent box rule)
  const [includeCategories, setIncludeCategories] = useState({
    mess: true,
    general: true,
    utilities: true,
    rent: false,
  });

  const settlementResult = calculateSettlement(
    group.members,
    expenses,
    utilities,
    rent,
    includeCategories
  );

  // Pre-generate PDF file as soon as PDF preview modal opens
  useEffect(() => {
    if (!isPdfPreviewOpen) {
      cachedPdfFileRef.current = null;
      return;
    }

    let isMounted = true;
    const pregenerate = async () => {
      const element = document.getElementById('pdf-report-document');
      if (!element) return;
      try {
        const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
        const opt = {
          margin: 6,
          filename: fileName,
          image: { type: 'jpeg' as const, quality: 0.95 },
          html2canvas: { scale: 1.5, useCORS: true, allowTaint: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        };
        const worker = html2pdf().set(opt).from(element);
        const blob = await worker.output('blob');
        if (isMounted) {
          const file = new File([blob], fileName, { type: 'application/pdf', lastModified: Date.now() });
          cachedPdfFileRef.current = file;
        }
      } catch (err) {
        console.warn('Background PDF pregeneration for share failed:', err);
      }
    };

    const timer = setTimeout(pregenerate, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isPdfPreviewOpen, fromDate, toDate, group.name, settlementResult]);

  const toggleCategory = (key: keyof typeof includeCategories) => {
    setIncludeCategories({
      ...includeCategories,
      [key]: !includeCategories[key],
    });
  };

  const sanitizeDocumentForHtml2Canvas = (clonedDoc: Document) => {
    try {
      const origDocEl = document.getElementById('pdf-report-document');
      const clonedDocEl = clonedDoc.getElementById('pdf-report-document');

      if (origDocEl && clonedDocEl) {
        const origElements = Array.from(origDocEl.querySelectorAll('*'));
        const clonedElements = Array.from(clonedDocEl.querySelectorAll('*'));

        clonedDocEl.style.backgroundColor = '#ffffff';
        clonedDocEl.style.color = '#0f172a';

        for (let i = 0; i < clonedElements.length; i++) {
          const origEl = origElements[i] as HTMLElement;
          const clonedEl = clonedElements[i] as HTMLElement;
          if (origEl && clonedEl && clonedEl.style) {
            const computed = window.getComputedStyle(origEl);
            if (computed.backgroundColor && computed.backgroundColor !== 'transparent' && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
              clonedEl.style.backgroundColor = computed.backgroundColor;
            }
            if (computed.color) {
              clonedEl.style.color = computed.color;
            }
            if (computed.borderColor) {
              clonedEl.style.borderColor = computed.borderColor;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Sanitize document for html2canvas failed:', e);
    }
  };

  const handlePrintPdf = async () => {
    const element = document.getElementById('pdf-report-document');
    if (!element) {
      window.print();
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
      const opt = {
        margin: 6,
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
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
    const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
    let targetFile = cachedPdfFileRef.current;

    setIsSharingPdf(true);
    try {
      // If pre-generated file isn't ready yet, generate it on demand
      if (!targetFile) {
        const element = document.getElementById('pdf-report-document');
        if (element) {
          const opt = {
            margin: 6,
            filename: fileName,
            image: { type: 'jpeg' as const, quality: 0.95 },
            html2canvas: { scale: 1.5, useCORS: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
          };

          const worker = html2pdf().set(opt).from(element);
          const blob = await worker.output('blob');
          targetFile = new File([blob], fileName, { type: 'application/pdf', lastModified: Date.now() });
          cachedPdfFileRef.current = targetFile;
        }
      }

      if (!targetFile) {
        alert('Unable to generate PDF report for sharing. Downloading PDF instead.');
        await handlePrintPdf();
        return;
      }

      // 1. Attempt native system share sheet with attached PDF file ONLY (supported on mobile Chrome/Safari)
      let sharedSuccessfully = false;
      if (navigator.canShare && navigator.canShare({ files: [targetFile] })) {
        try {
          await navigator.share({
            title: `${group.name} Settlement Report`,
            files: [targetFile],
          });
          sharedSuccessfully = true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            return; // User canceled the native share dialog intentionally
          }
          console.warn('Native canShare failed:', shareErr);
        }
      } else if (navigator.share) {
        try {
          await navigator.share({
            title: `${group.name} Settlement Report`,
            files: [targetFile],
          });
          sharedSuccessfully = true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            return; // User canceled intentionally
          }
          console.warn('Native share failed:', shareErr);
        }
      }

      if (sharedSuccessfully) return;

      // 2. Desktop & unsupported browsers fallback: Download PDF file directly to user's device
      const url = URL.createObjectURL(targetFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Share report handler error:', err);
      // Fallback to print / save
      await handlePrintPdf();
    } finally {
      setIsSharingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner */}
      <GlassContainer
        variant="card"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border-2 border-black shadow-xl bg-white text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <span className="text-xs font-black text-white uppercase tracking-wider bg-black px-3.5 py-1 rounded-full border border-black">
            Settlement Engine & Dynamic Balance
          </span>
          <h2 className="text-2xl font-black mt-2 text-slate-950">Report & Member Settlement</h2>
          <p className="text-xs text-slate-700 font-medium mt-1">
            Exact meal rates, individual spending balances, and simplified debt transfers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPdfPreviewOpen(true)}
            className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 border border-black transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-slate-900" />
            <span>Export to PDF</span>
          </button>

          <button
            onClick={onSaveSettlement}
            className="bg-black hover:bg-slate-800 text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 border border-black cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 stroke-[3]" />
            <span>Finalize Settlement</span>
          </button>
        </div>
      </GlassContainer>

      {/* Date Picker & Category Checkbox Filters */}
      <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-black/20 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Calendar className="w-4 h-4 text-slate-900" />
            <span>Settlement Period Range:</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-black rounded-xl font-semibold text-slate-900 focus:outline-none"
            />
            <span className="text-slate-600">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-black rounded-xl font-semibold text-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Checkboxes */}
        <div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
            Include Categories in Calculation:
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { key: 'mess', label: 'Mess Expenses' },
              { key: 'general', label: 'General Expenses' },
              { key: 'utilities', label: 'Utilities (DEWA & WiFi)' },
            ].map(({ key, label }) => {
              const isChecked = includeCategories[key as keyof typeof includeCategories];
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key as keyof typeof includeCategories)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isChecked
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-slate-700 border-black hover:bg-slate-100'
                  }`}
                >
                  {isChecked ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-slate-600" />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassContainer>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassContainer variant="card" className="p-4 border border-black bg-white text-slate-900 shadow-md">
          <span className="text-[10px] font-bold text-slate-900 uppercase">Total Mess Bill</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.totalMessExpenses}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-slate-950"
            />
          </div>
          <span className="text-[10px] text-slate-600 block mt-1">Rate: ~{settlementResult.dailyMealRate.toFixed(2)} AED/day</span>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-black bg-white text-slate-900 shadow-md">
          <span className="text-[10px] font-bold text-slate-900 uppercase">General Expenses</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.totalGeneralExpenses}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-slate-950"
            />
          </div>
          <span className="text-[10px] text-slate-600 block mt-1">Equal split</span>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-black bg-white text-slate-900 shadow-md">
          <span className="text-[10px] font-bold text-slate-900 uppercase">Utilities (DEWA & WiFi)</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.totalUtilities}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-slate-950"
            />
          </div>
          <span className="text-[10px] text-slate-600 block mt-1">DEWA & WiFi Bills</span>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border-2 border-black bg-white text-slate-900 shadow-md">
          <span className="text-[10px] font-bold text-slate-900 uppercase">Grand Total</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.grandTotalExpenses}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-slate-950"
            />
          </div>
          <span className="text-[10px] text-slate-600 block mt-1">{group.members.length} Members</span>
        </GlassContainer>
      </div>

      {/* SECTION 1: Member-wise Calculation Table */}
      <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-900" />
            Member-wise Calculation Breakdown
          </h3>
          <span className="text-xs text-slate-700 font-medium">
            Mess Meal Rate: <strong className="text-slate-950">{settlementResult.dailyMealRate.toFixed(2)} AED/day</strong>
          </span>
        </div>

        {/* Mobile Responsive Member Calculation Cards (100% width, no horizontal scroll) */}
        <div className="block sm:hidden space-y-3">
          {settlementResult.memberSummaries.map((ms) => {
            const isOverpaid = ms.balance >= 0;
            return (
              <div
                key={ms.memberId}
                className="bg-white p-3.5 rounded-2xl border border-black space-y-2.5 text-xs text-slate-900 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-900" />
                    {ms.memberName}
                  </span>
                  <span className="bg-black text-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-black">
                    {ms.daysPresent} Days Present
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-2 rounded-xl border border-black">
                    <span className="text-slate-600 block text-[10px] font-medium">Actual Share</span>
                    <span className="font-extrabold text-slate-950">{ms.totalActualExpense.toFixed(2)} AED</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-black">
                    <span className="text-slate-600 block text-[10px] font-medium">Amount Paid</span>
                    <span className="font-extrabold text-slate-950">{ms.totalAmountSpent.toFixed(2)} AED</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-700 font-semibold">Final Status:</span>
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                      isOverpaid
                        ? 'bg-slate-100 text-slate-900 border border-black'
                        : 'bg-rose-50 text-rose-950 border border-black'
                    }`}
                  >
                    {isOverpaid ? `+${ms.balance.toFixed(2)} AED (Gets Back)` : `${ms.balance.toFixed(2)} AED (DUE)`}
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
              <tr className="bg-slate-100 text-slate-900 uppercase tracking-wider font-bold border-b border-black">
                <th className="py-3 px-3">Member</th>
                <th className="py-3 px-2 text-center">Days Present</th>
                <th className="py-3 px-2 text-right">Actual Expense Share</th>
                <th className="py-3 px-2 text-right">Amount Paid</th>
                <th className="py-3 px-3 text-right">Final Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/15 font-medium text-slate-900">
              {settlementResult.memberSummaries.map((ms) => {
                const isOverpaid = ms.balance >= 0;

                return (
                  <tr key={ms.memberId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <span>{ms.memberName}</span>
                    </td>

                    <td className="py-3 px-2 text-center font-semibold text-slate-800">
                      {ms.daysPresent} days
                    </td>

                    <td className="py-3 px-2 text-right font-semibold text-slate-800">
                      {ms.totalActualExpense.toFixed(2)} AED
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-slate-950">
                      {ms.totalAmountSpent.toFixed(2)} AED
                    </td>

                    <td className="py-3 px-3 text-right font-extrabold">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-xl text-xs ${
                          isOverpaid
                            ? 'bg-slate-100 text-slate-900 border border-black'
                            : 'bg-rose-50 text-rose-950 border border-black'
                        }`}
                      >
                        {isOverpaid ? `+${ms.balance.toFixed(2)} AED (Gets Back)` : `${ms.balance.toFixed(2)} AED (DUE)`}
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
      <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-black/20 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-slate-900" />
              Simplified Debt Settlement Flow
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Minimum number of transactions needed to clear all room debts
            </p>
          </div>

          <span className="bg-black text-white text-xs font-bold px-3 py-1 rounded-full border border-black">
            {settlementResult.settlementFlows.length} Direct Payments
          </span>
        </div>

        {settlementResult.settlementFlows.length > 0 ? (
          <div className="space-y-3">
            {settlementResult.settlementFlows.map((flow) => (
              <div
                key={flow.id}
                className="bg-white border border-black rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 hover:border-black transition-all text-slate-900 shadow-xs"
              >
                {/* Payer (Debtor) */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-black text-white border border-black font-bold flex items-center justify-center shrink-0">
                    {flow.fromMemberName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      Payer (DUE)
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{flow.fromMemberName}</h4>
                  </div>
                </div>

                {/* Arrow & Amount */}
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl border border-black">
                  <span className="text-xs text-slate-800 font-medium">pays</span>
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                  <DualCurrencyDisplay
                    amount={flow.amount}
                    baseCurrency={group.currency}
                    preferredCurrency={preferredCurrency}
                    customRates={customRates}
                    layout="pill"
                    baseClassName="text-base font-black text-slate-950"
                  />
                </div>

                {/* Receiver (Creditor) */}
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block text-right sm:text-left">
                      Receiver (Gets Back)
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{flow.toMemberName}</h4>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-black text-white border border-black font-bold flex items-center justify-center shrink-0">
                    {flow.toMemberName.substring(0, 2).toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-3xl border border-black p-4">
            <CheckCircle className="w-8 h-8 text-black mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-900">All Expenses Settled Perfectly!</h4>
            <p className="text-xs text-slate-600 mt-1">No member has DUE money to another member in this cycle.</p>
          </div>
        )}
      </GlassContainer>

      {/* PDF REPORT PREVIEW MODAL */}
      {isPdfPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100/95 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          {/* Top Control Header Bar */}
          <div className="w-full max-w-5xl bg-slate-900 border border-black p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-white shadow-xl shrink-0 mb-3">
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
                disabled={isSharingPdf || isGeneratingPdf}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 sm:py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-700 transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-md"
              >
                {isSharingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Preparing PDF...</span>
                  </>
                ) : isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span className="text-emerald-100">Copied Report!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-white" />
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
          <div className="w-full max-w-5xl overflow-x-auto h-fit">
            <div
              id="pdf-report-document"
              className="bg-white text-slate-900 rounded-2xl shadow-xl p-6 sm:p-10 w-full mx-auto space-y-6 text-xs font-sans border-2 border-black h-fit"
            >
              {/* Header Stamp & Title */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={uaeMessLogo}
                    alt="UAE MESS SYSTEM Logo"
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/80 shadow-md shrink-0"
                  />
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                      UAE MESS SYSTEM
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
                <div className="p-3 rounded-xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#0f172a' }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: '#64748b' }}>Total Mess Expense</span>
                  <div className="text-base font-black mt-0.5" style={{ color: '#0f172a' }}>
                    {settlementResult.totalMessExpenses.toFixed(2)} {group.currency}
                  </div>
                  <span className="text-[10px]" style={{ color: '#64748b' }}>Rate: {settlementResult.dailyMealRate.toFixed(2)} {group.currency}/day</span>
                </div>

                <div className="p-3 rounded-xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#0f172a' }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: '#64748b' }}>General Expense</span>
                  <div className="text-base font-black mt-0.5" style={{ color: '#0f172a' }}>
                    {settlementResult.totalGeneralExpenses.toFixed(2)} {group.currency}
                  </div>
                  <span className="text-[10px]" style={{ color: '#64748b' }}>Shared equally</span>
                </div>

                <div className="p-3 rounded-xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#0f172a' }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: '#64748b' }}>Utilities (DEWA & WiFi)</span>
                  <div className="text-base font-black mt-0.5" style={{ color: '#0f172a' }}>
                    {settlementResult.totalUtilities.toFixed(2)} {group.currency}
                  </div>
                  <span className="text-[10px]" style={{ color: '#64748b' }}>DEWA, WiFi Bills</span>
                </div>

                <div className="p-3 rounded-xl border" style={{ backgroundColor: '#ecfdf5', borderColor: '#6ee7b7', color: '#064e3b' }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: '#065f46' }}>Grand Total</span>
                  <div className="text-base font-black mt-0.5" style={{ color: '#022c22' }}>
                    {settlementResult.grandTotalExpenses.toFixed(2)} {group.currency}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: '#047857' }}>{group.members.length} Members</span>
                </div>
              </div>

              {/* Member-wise Calculation Table */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 pb-1 border-b flex items-center justify-between" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>
                  <span>1. Member-wise Calculation Breakdown</span>
                  <span className="font-normal" style={{ color: '#64748b' }}>Daily Rate: {settlementResult.dailyMealRate.toFixed(2)} {group.currency}/day</span>
                </h3>

                <table className="w-full text-left border-collapse border" style={{ borderColor: '#e2e8f0' }}>
                  <thead>
                    <tr className="uppercase font-bold text-[10px]" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                      <th className="p-2 border" style={{ borderColor: '#e2e8f0' }}>Member</th>
                      <th className="p-2 border text-center" style={{ borderColor: '#e2e8f0' }}>Days Present</th>
                      <th className="p-2 border text-right" style={{ borderColor: '#e2e8f0' }}>Actual Share</th>
                      <th className="p-2 border text-right" style={{ borderColor: '#e2e8f0' }}>Amount Paid</th>
                      <th className="p-2 border text-right" style={{ borderColor: '#e2e8f0' }}>Final Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium" style={{ borderColor: '#e2e8f0' }}>
                    {settlementResult.memberSummaries.map((ms, idx) => {
                      const isOverpaid = ms.balance >= 0;
                      return (
                        <tr key={ms.memberId} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                          <td className="p-2 border font-bold" style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>
                            {ms.memberName}
                          </td>
                          <td className="p-2 border text-center" style={{ borderColor: '#e2e8f0', color: '#334155' }}>
                            {ms.daysPresent} days
                          </td>
                          <td className="p-2 border text-right" style={{ borderColor: '#e2e8f0', color: '#334155' }}>
                            {ms.totalActualExpense.toFixed(2)} {group.currency}
                          </td>
                          <td className="p-2 border text-right font-bold" style={{ borderColor: '#e2e8f0', color: '#b45309' }}>
                            {ms.totalAmountSpent.toFixed(2)} {group.currency}
                          </td>
                          <td className="p-2 border text-right font-black" style={{ borderColor: '#e2e8f0' }}>
                            <span style={{ color: isOverpaid ? '#047857' : '#be123c' }}>
                              {isOverpaid
                                ? `+${ms.balance.toFixed(2)} ${group.currency} (Gets Back)`
                                : `${ms.balance.toFixed(2)} ${group.currency} (DUE)`}
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
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>
                  2. Simplified Debt Settlement Transactions
                </h3>

                {settlementResult.settlementFlows.length > 0 ? (
                  <div className="space-y-1.5">
                    {settlementResult.settlementFlows.map((flow) => (
                      <div
                        key={flow.id}
                        className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
                        style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#0f172a' }}
                      >
                        <span className="font-bold" style={{ color: '#be123c' }}>{flow.fromMemberName} (Payer)</span>
                        <div className="flex items-center gap-1.5 font-bold" style={{ color: '#475569' }}>
                          <span>pays</span>
                          <ArrowRight className="w-3.5 h-3.5" style={{ color: '#059669' }} />
                          <span className="font-black px-2 py-0.5 rounded border" style={{ backgroundColor: '#fef3c7', borderColor: '#fcd34d', color: '#0f172a' }}>
                            {flow.amount.toFixed(2)} {group.currency}
                          </span>
                        </div>
                        <span className="font-bold" style={{ color: '#047857' }}>{flow.toMemberName} (Receiver)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold p-2 rounded border" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
                    ✓ All member balances are fully settled in this cycle.
                  </p>
                )}
              </div>

              {/* Document Signatures & Stamp */}
              <div className="pt-6 border-t flex items-end justify-between text-[11px]" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
                <div>
                  <p className="font-bold" style={{ color: '#1e293b' }}>Verified & Approved By:</p>
                  <p className="mt-6 border-t pt-1 font-semibold" style={{ borderColor: '#cbd5e1' }}>Room Manager Signature</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded font-black text-[10px] uppercase border" style={{ backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }}>
                    OFFICIAL MESS AUDIT STAMP
                  </div>
                  <p className="mt-1 text-[10px]" style={{ color: '#94a3b8' }}>Generated by Room Suite Portal</p>
                </div>
              </div>

              {/* Developer / Application Creator Footer */}
              <div className="pt-4 border-t text-center text-xs font-bold leading-tight" style={{ borderColor: '#e2e8f0', color: '#334155' }}>
                <p>This application created by AL AMIN</p>
                <p>Mobile No. +971 54 487 4028</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
