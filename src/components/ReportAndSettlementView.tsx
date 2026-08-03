import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import uaeMessLogo from '../assets/images/uae_mess_logo_1785022712689.jpg';
import { Group, Expense, UtilityBill, RentContribution } from '../types';
import { calculateSettlement } from '../utils/settlementCalculator';
import { GlassContainer } from './GlassContainer';
import {
  FileText,
  CheckCircle,
  ArrowRight,
  User,
  Calendar,
  CheckSquare,
  Square,
  Sparkles,
  X,
  Check,
  Share2,
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
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const cachedPdfFileRef = useRef<File | null>(null);

  const [includeCategories, setIncludeCategories] = useState({
    mess: true,
    general: false,
    utilities: false,
    rent: false,
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

  const sanitizeCssText = (text: string): string => {
    if (!text) return text;
    let css = text;
    css = css.replace(/\bin\s+(oklab|oklch)\b/gi, 'in srgb');
    const targets = ['oklch(', 'oklab(', 'color-mix(', 'light-dark(', 'color('];
    let passCount = 0;
    while (passCount < 30) {
      passCount++;
      let foundIndex = -1;
      let foundTargetLen = 0;
      const lower = css.toLowerCase();
      for (const t of targets) {
        const idx = lower.indexOf(t);
        if (idx !== -1 && (foundIndex === -1 || idx < foundIndex)) {
          foundIndex = idx;
          foundTargetLen = t.length;
        }
      }
      if (foundIndex === -1) break;
      let depth = 0;
      let endIdx = foundIndex;
      for (let i = foundIndex; i < css.length; i++) {
        if (css[i] === '(') depth++;
        else if (css[i] === ')') {
          depth--;
          if (depth === 0) {
            endIdx = i + 1;
            break;
          }
        }
      }
      if (endIdx > foundIndex) {
        css = css.substring(0, foundIndex) + '#1e293b' + css.substring(endIdx);
      } else {
        css = css.substring(0, foundIndex) + '#1e293b' + css.substring(foundIndex + foundTargetLen);
      }
    }
    css = css.replace(/\b(oklab|oklch)\b/gi, 'srgb');
    return css;
  };

  const sanitizeDocumentForHtml2Canvas = (clonedDoc: Document) => {
    try {
      const styles = clonedDoc.querySelectorAll('style');
      styles.forEach((style) => {
        let css = style.textContent || '';
        style.textContent = sanitizeCssText(css);
      });
    } catch (err) {
      console.warn('Error sanitizing cloned document for html2canvas:', err);
    }
  };

  useEffect(() => {
    if (!isPdfPreviewOpen) {
      cachedPdfFileRef.current = null;
      return;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const pregenerate = async () => {
      const element = document.getElementById('pdf-report-document');
      if (!element) return;
      try {
        const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
        const opt = {
          margin: 6,
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };
        const html2pdfModule = (html2pdf as unknown) as () => any;
        const worker = html2pdfModule().set(opt).from(element);
        const blob = await worker.output('blob');
        const file = new File([blob], fileName, { type: 'application/pdf' });
        cachedPdfFileRef.current = file;
      } catch (err) {
        console.warn('Background PDF pregeneration for share failed:', err);
      }
    };

    const timer = setTimeout(pregenerate, 350);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isPdfPreviewOpen, fromDate, toDate, group.name, settlementResult]);

  const handlePrintPdf = async () => {
    const element = document.getElementById('pdf-report-document');
    if (!element) return;
    setIsGeneratingPdf(true);
    try {
      const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
      const opt = {
        margin: 6,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      const html2pdfModule = (html2pdf as unknown) as () => any;
      await html2pdfModule().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareReport = async () => {
    const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
    setIsSharingPdf(true);

    try {
      let targetFile = cachedPdfFileRef.current;

      if (!targetFile) {
        const element = document.getElementById('pdf-report-document');
        if (element) {
          const opt = {
            margin: 6,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          };

          const html2pdfModule = (html2pdf as unknown) as () => any;
          const worker = html2pdfModule().set(opt).from(element);
          const blob = await worker.output('blob');
          targetFile = new File([blob], fileName, { type: 'application/pdf' });
          cachedPdfFileRef.current = targetFile;
        }
      }

      if (!targetFile) {
        alert("Could not generate PDF for sharing. Please try downloading.");
        return;
      }

      if (navigator.canShare && navigator.canShare({ files: [targetFile] })) {
        await navigator.share({
          title: `${group.name} Settlement Report`,
          files: [targetFile],
        });
      } else {
        alert("Direct PDF file sharing is not supported on this browser. Please download the PDF.");
      }
    } catch (shareErr: any) {
      if (shareErr?.name !== 'AbortError') {
        console.error("Native PDF share error:", shareErr);
      }
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
          <span className="text-[10px] text-slate-600 block mt-1">Equal split</span>
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

      {/* Member-wise Calculation Table */}
      <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-900" /> Member-wise Calculation Breakdown
          </h3>
          <span className="text-xs text-slate-700 font-medium">
            Split Mode: <strong className="text-slate-950">Equal Split</strong>
          </span>
        </div>

        {/* Mobile View */}
        <div className="block sm:hidden space-y-3">
          {settlementResult.memberSummaries.map((ms) => {
            const isOverpaid = ms.balance >= 0;
            return (
              <div key={ms.memberId} className="bg-white p-3.5 rounded-2xl border border-black space-y-2.5 text-xs text-slate-900 shadow-xs">
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-900" /> {ms.memberName}
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
                  <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                    isOverpaid ? 'bg-slate-100 text-slate-900 border border-black' : 'bg-rose-50 text-rose-950 border border-black'
                  }`}>
                    {isOverpaid ? `+${ms.balance.toFixed(2)} AED (Gets Back)` : `${ms.balance.toFixed(2)} AED (DUE)`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 uppercase tracking-wider font-bold border-b border-black">
                <th className="py-3 px-3">Member</th>
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
                      {isOverpaid
                        ? `+${ms.balance.toFixed(2)} AED (Gets Back)`
                        : `${ms.balance.toFixed(2)} AED (DUE)`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
