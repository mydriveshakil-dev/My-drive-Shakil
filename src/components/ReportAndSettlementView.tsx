import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  // Safe html2pdf engine resolver to handle Vercel Vite CJS/ESM bundling & dynamic imports
  const getHtml2PdfEngine = async () => {
    try {
      if (typeof html2pdf === 'function') return html2pdf;
      if (typeof (html2pdf as any)?.default === 'function') return (html2pdf as any).default;
      if (typeof (window as any)?.html2pdf === 'function') return (window as any).html2pdf;
      const imported = await import('html2pdf.js');
      if (typeof imported === 'function') return imported;
      if (typeof imported?.default === 'function') return imported.default;
    } catch (err) {
      console.warn('html2pdf engine import error:', err);
    }
    return null;
  };

  // Pre-generate PDF file as soon as PDF preview modal opens
  useEffect(() => {
    if (!isPdfPreviewOpen) {
      cachedPdfFileRef.current = null;
      return;
    }

    // Lock background scroll when preview modal is open
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const pregenerate = async () => {
      const element = document.getElementById('pdf-report-document');
      if (!element) return;
      try {
        const engine = await getHtml2PdfEngine();
        if (!engine) return;

        const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
        const opt = {
          margin: 6,
          filename: fileName,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        };
        const worker = engine().set(opt).from(element);
        const blob = await worker.output('blob');
        const file = new File([blob], fileName, { type: 'application/pdf' });
        cachedPdfFileRef.current = file;
      } catch (err) {
        console.warn('Background PDF pregeneration for share failed:', err);
      }
    };

    const timer = setTimeout(pregenerate, 150);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isPdfPreviewOpen, fromDate, toDate, group.name, settlementResult]);

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
      styles.forEach((s) => {
        if (s.textContent) {
          s.textContent = sanitizeCssText(s.textContent);
        }
      });

      const elements = clonedDoc.querySelectorAll('*');
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const styleAttr = htmlEl.getAttribute('style');
        if (styleAttr) {
          htmlEl.setAttribute('style', sanitizeCssText(styleAttr));
        }
      });
    } catch (e) {
      console.warn('Sanitize document for html2canvas failed:', e);
    }
  };

  const handlePrintPdf = async () => {
    const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;

    // 1. If pre-generated PDF file is already cached, trigger instant download
    if (cachedPdfFileRef.current) {
      const blobUrl = URL.createObjectURL(cachedPdfFileRef.current);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = fileName;
      downloadAnchor.style.display = 'none';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }

    const element = document.getElementById('pdf-report-document');
    if (!element) {
      window.print();
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const engine = await getHtml2PdfEngine();
      if (!engine) {
        window.print();
        return;
      }

      const opt = {
        margin: 6,
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };

      const worker = engine().set(opt).from(element);
      const blob = await worker.output('blob');
      const generatedFile = new File([blob], fileName, { type: 'application/pdf' });
      cachedPdfFileRef.current = generatedFile;

      // Trigger automatic PDF download via anchor tag with download attribute
      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = fileName;
      downloadAnchor.style.display = 'none';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('PDF export error, using fallback print():', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareReport = async () => {
    const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
    const summaryText = `📋 *${group.name} - Settlement Report*\n📅 Period: ${fromDate} to ${toDate}\n\n💰 Grand Total: ${settlementResult.grandTotalExpenses.toFixed(2)} ${group.currency}\n\n*Settlement Transactions:*\n${
      settlementResult.settlementFlows.length > 0
        ? settlementResult.settlementFlows
            .map((f) => `• ${f.fromMemberName} pays ${f.toMemberName}: ${f.amount.toFixed(2)} ${group.currency}`)
            .join('\n')
        : 'All balances cleared!'
    }`;

    let targetFile = cachedPdfFileRef.current;

    // If pre-generated file isn't ready yet, attempt to generate it on demand
    if (!targetFile) {
      const element = document.getElementById('pdf-report-document');
      if (element) {
        try {
          setIsSharingPdf(true);
          const engine = await getHtml2PdfEngine();
          if (engine) {
            const opt = {
              margin: 6,
              filename: fileName,
              image: { type: 'jpeg' as const, quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, onclone: sanitizeDocumentForHtml2Canvas },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            };

            const worker = engine().set(opt).from(element);
            const blob = await worker.output('blob');
            targetFile = new File([blob], fileName, { type: 'application/pdf' });
            cachedPdfFileRef.current = targetFile;
          }
        } catch (err) {
          console.warn('On-demand PDF generation for share failed:', err);
        } finally {
          setIsSharingPdf(false);
        }
      }
    }

    // 1. Invoke navigator.share API with PDF file data if supported
    if (targetFile && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [targetFile] })) {
      try {
        await navigator.share({
          title: `${group.name} Settlement Report`,
          text: summaryText,
          files: [targetFile],
        });
        return; // Native share with PDF file succeeded
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return; // User canceled share sheet intentionally
        }
        console.warn('Native PDF file share rejected or failed:', shareErr);
      }
    }

    // 2. Fallback to native text share if file sharing is unsupported
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${group.name} Settlement Report`,
          text: summaryText,
        });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          return;
        }
        console.warn('Native text share failed:', e);
      }
    }

    // 3. Fallback: Automatic download using anchor tag with download attribute + clipboard summary copy
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(summaryText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      }

      if (targetFile) {
        const url = URL.createObjectURL(targetFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      console.warn('Fallback download/clipboard error:', e);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner - Navy Theme */}
      <GlassContainer
        variant="card"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border border-blue-900/40 shadow-xl bg-gradient-to-r from-[#07193F] to-[#041029] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <span className="text-xs font-black text-blue-200 uppercase tracking-wider bg-blue-500/20 px-3.5 py-1 rounded-full border border-blue-400/30">
            Settlement Engine & Dynamic Balance
          </span>
          <h2 className="text-2xl font-black mt-2 text-white">Report & Member Settlement</h2>
          <p className="text-xs text-blue-100/80 font-medium mt-1">
            Exact meal rates and individual spending balance calculations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPdfPreviewOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 border border-white/20 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Export to PDF</span>
          </button>

          <button
            onClick={onSaveSettlement}
            className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95 border border-blue-400/30 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 stroke-[3]" />
            <span>Finalize Settlement</span>
          </button>
        </div>
      </GlassContainer>

      {/* Date Picker & Category Checkbox Filters */}
      <GlassContainer variant="card" className="p-5 border border-slate-200/80 bg-white text-slate-900 shadow-md space-y-4 rounded-3xl">
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
              className="px-3 py-1.5 bg-[#0B2556] border border-blue-400/30 rounded-xl font-semibold text-white focus:outline-none"
            />
            <span className="text-blue-200">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 bg-[#0B2556] border border-blue-400/30 rounded-xl font-semibold text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Category Checkboxes */}
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-[#0052FF] text-white border-blue-400/40 shadow-md shadow-blue-600/30'
                      : 'bg-[#0B2556] text-blue-200 border-blue-400/25 hover:bg-[#07193F]'
                  }`}
                >
                  {isChecked ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-blue-300" />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassContainer>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassContainer variant="card" className="p-4 border border-blue-400/25 bg-[#0B2556] text-white shadow-md">
          <span className="text-[10px] font-bold text-blue-200 uppercase">Total Mess Bill</span>
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
          <span className="text-[10px] text-blue-200/80 block mt-1">Equal split</span>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-blue-400/25 bg-[#0B2556] text-white shadow-md">
          <span className="text-[10px] font-bold text-blue-200 uppercase">General Expenses</span>
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
          <span className="text-[10px] text-blue-200/80 block mt-1">Equal split</span>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-blue-400/25 bg-[#0B2556] text-white shadow-md">
          <span className="text-[10px] font-bold text-blue-200 uppercase">Utilities (DEWA & WiFi)</span>
          <div className="text-xl font-black mt-1">
            <DualCurrencyDisplay
              amount={settlementResult.totalUtilities}
              baseCurrency={group.currency}
              preferredCurrency={preferredCurrency}
              customRates={customRates}
              layout="stacked"
              baseClassName="text-xl font-black text-white"
            />
          </div>
          <span className="text-[10px] text-blue-200/80 block mt-1">DEWA & WiFi Bills</span>
        </GlassContainer>

        <GlassContainer variant="card" className="p-4 border border-blue-400/30 bg-[#0B2556] text-white shadow-md">
          <span className="text-[10px] font-bold text-blue-200 uppercase">Grand Total</span>
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
          <span className="text-[10px] text-blue-200/80 block mt-1">{group.members.length} Members</span>
        </GlassContainer>
      </div>

      {/* SECTION 1: Member-wise Calculation Table */}
      <GlassContainer variant="card" className="p-5 border border-blue-400/25 bg-[#0B2556] text-white shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-blue-400/20 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-300" />
            Member-wise Calculation Breakdown
          </h3>
          <span className="text-xs text-blue-200 font-medium">
            Split Mode: <strong className="text-white">Equal Split</strong>
          </span>
        </div>

        {/* Mobile Responsive Member Calculation Cards (100% width, no horizontal scroll) */}
        <div className="block sm:hidden space-y-3">
          {settlementResult.memberSummaries.map((ms) => {
            const isOverpaid = ms.balance >= 0;
            return (
              <div
                key={ms.memberId}
                className="bg-[#07193F] p-3.5 rounded-2xl border border-blue-400/20 space-y-2.5 text-xs text-white shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-blue-400/20 pb-2">
                  <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-300" />
                    {ms.memberName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#0B2556] p-2 rounded-xl border border-blue-400/20">
                    <span className="text-blue-200/80 block text-[10px] font-medium">Actual Share</span>
                    <span className="font-extrabold text-white">{ms.totalActualExpense.toFixed(2)} AED</span>
                  </div>
                  <div className="bg-[#0B2556] p-2 rounded-xl border border-blue-400/20">
                    <span className="text-blue-200/80 block text-[10px] font-medium">Amount Paid</span>
                    <span className="font-extrabold text-white">{ms.totalAmountSpent.toFixed(2)} AED</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-blue-200 font-semibold">Final Status:</span>
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                      isOverpaid
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
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
              <tr className="bg-[#07193F] text-blue-200 uppercase tracking-wider font-bold border-b border-blue-400/20">
                <th className="py-3 px-3">Member</th>
                <th className="py-3 px-2 text-right">Actual Expense Share</th>
                <th className="py-3 px-2 text-right">Amount Paid</th>
                <th className="py-3 px-3 text-right">Final Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-400/15 font-medium text-white">
              {settlementResult.memberSummaries.map((ms) => {
                const isOverpaid = ms.balance >= 0;

                return (
                  <tr key={ms.memberId} className="hover:bg-[#07193F]/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      <span>{ms.memberName}</span>
                    </td>

                    <td className="py-3 px-2 text-right font-semibold text-blue-100">
                      {ms.totalActualExpense.toFixed(2)} AED
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-white">
                      {ms.totalAmountSpent.toFixed(2)} AED
                    </td>

                    <td className="py-3 px-3 text-right font-extrabold">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-xl text-xs ${
                          isOverpaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
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

      {/* PDF REPORT PREVIEW MODAL / PAGE (Rendered via Portal to top of body) */}
      {isPdfPreviewOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200">
            {/* Top Control Header Bar - Fixed Full Width */}
            <div className="w-full bg-slate-900 border-b border-slate-800 p-2.5 sm:p-4 flex items-center justify-between gap-2 sm:gap-3 text-white shadow-2xl shrink-0 z-20">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F9A826] text-[#0B4A3F] font-black flex items-center justify-center shadow-md shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-base font-black text-white flex items-center gap-1.5 truncate">
                    <span className="truncate">Settlement Report PDF Preview</span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase hidden md:inline-block">
                      Full PDF Size
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-emerald-200/80 truncate max-w-[150px] sm:max-w-md">
                    {group.name} • Period: {fromDate} to {toDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Save / Download PDF Button */}
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={isGeneratingPdf}
                  className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      <span className="hidden sm:inline">Downloading PDF...</span>
                      <span className="sm:hidden text-[11px]">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Download PDF</span>
                      <span className="sm:hidden text-[11px]">PDF</span>
                    </>
                  )}
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShareReport}
                  disabled={isSharingPdf || isGeneratingPdf}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl text-xs flex items-center gap-1 border border-emerald-700 transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-md"
                >
                  {isSharingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-white" />
                      <span className="hidden sm:inline">Preparing PDF...</span>
                      <span className="sm:hidden text-[11px]">Wait...</span>
                    </>
                  ) : isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
                      <span className="text-emerald-100 hidden sm:inline">Copied Report!</span>
                      <span className="text-emerald-100 sm:hidden text-[11px]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      <span className="text-[11px] sm:text-xs">Share</span>
                    </>
                  )}
                </button>

                {/* Close Modal Button */}
                <button
                  type="button"
                  onClick={() => setIsPdfPreviewOpen(false)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shrink-0"
                  title="Close Preview"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Dedicated Device Responsive PDF Document Viewport */}
            <div className="flex-1 w-full overflow-y-auto overflow-x-auto p-2 sm:p-6 md:p-8 flex justify-center items-start bg-slate-900/95 scrollbar-thin">
              <div className="w-full max-w-4xl lg:max-w-5xl my-1 sm:my-4">
                <div
                  id="pdf-report-document"
                  className="bg-white text-slate-900 rounded-2xl shadow-2xl p-4 sm:p-8 md:p-10 w-full mx-auto space-y-4 sm:space-y-6 text-xs font-sans border-2 border-slate-900 box-border relative"
                >
                  {/* Header Stamp & Title */}
                  <div className="border-b-2 border-slate-900 pb-4 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={uaeMessLogo}
                        alt="UAE MESS SYSTEM Logo"
                        className="w-12 h-12 rounded-xl object-cover border-2 border-amber-500/80 shadow-md shrink-0"
                      />
                      <div>
                        <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">
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

                    <div className="text-right text-[11px] font-medium text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <p className="font-bold text-slate-900 text-xs">Group: {group.name}</p>
                      <p className="leading-normal">
                        Settlement Period:{' '}
                        <strong className="text-emerald-700">{fromDate}</strong> to{' '}
                        <strong className="text-emerald-700">{toDate}</strong>
                      </p>
                      <p className="leading-normal">
                        Generated:{' '}
                        {new Date().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Key Summary Totals Grid */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Total Mess Expense
                      </span>
                      <div className="text-base font-black text-slate-900 my-1 leading-snug">
                        {settlementResult.totalMessExpenses.toFixed(2)} {group.currency}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium leading-normal">
                        Shared equally
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        General Expense
                      </span>
                      <div className="text-base font-black text-slate-900 my-1 leading-snug">
                        {settlementResult.totalGeneralExpenses.toFixed(2)} {group.currency}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium leading-normal">
                        Shared equally
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Utilities (DEWA & WiFi)
                      </span>
                      <div className="text-base font-black text-slate-900 my-1 leading-snug">
                        {settlementResult.totalUtilities.toFixed(2)} {group.currency}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium leading-normal">
                        DEWA, WiFi Bills
                      </span>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        Grand Total
                      </span>
                      <div className="text-base font-black text-emerald-950 my-1 leading-snug">
                        {settlementResult.grandTotalExpenses.toFixed(2)} {group.currency}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold leading-normal">
                        {group.members.length} Members
                      </span>
                    </div>
                  </div>

                  {/* Member-wise Calculation Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 pb-1.5 border-b border-slate-200 flex items-center justify-between">
                      <span>1. Member-wise Calculation Breakdown</span>
                      <span className="text-slate-500 font-normal text-xs">
                        Split Mode: Equal Split
                      </span>
                    </h3>

                    <div className="w-full rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                            <th className="p-2.5 border-b border-r border-slate-200">Member</th>
                            <th className="p-2.5 border-b border-r border-slate-200 text-right">Actual Share</th>
                            <th className="p-2.5 border-b border-r border-slate-200 text-right">Amount Paid</th>
                            <th className="p-2.5 border-b border-slate-200 text-right">Final Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-xs">
                          {settlementResult.memberSummaries.map((ms) => {
                            const isOverpaid = ms.balance >= 0;
                            return (
                              <tr key={ms.memberId} className="even:bg-slate-50/70">
                                <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 leading-normal">
                                  {ms.memberName}
                                </td>
                                <td className="p-2.5 border-r border-slate-200 text-right text-slate-700 leading-normal">
                                  {ms.totalActualExpense.toFixed(2)} {group.currency}
                                </td>
                                <td className="p-2.5 border-r border-slate-200 text-right font-bold text-amber-700 leading-normal">
                                  {ms.totalAmountSpent.toFixed(2)} {group.currency}
                                </td>
                                <td className="p-2.5 text-right font-black leading-normal">
                                  <span className={isOverpaid ? 'text-emerald-700' : 'text-rose-700'}>
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
                  </div>

                  {/* Simplified Debt Settlement Flow Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 pb-1.5 border-b border-slate-200">
                      2. Simplified Debt Settlement Transactions
                    </h3>

                    {settlementResult.settlementFlows.length > 0 ? (
                      <div className="space-y-2">
                        {settlementResult.settlementFlows.map((flow) => (
                          <div
                            key={flow.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs shadow-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                              <span className="font-bold text-rose-700 text-xs leading-normal">
                                {flow.fromMemberName} <span className="text-slate-500 font-medium text-[11px]">(Payer)</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-slate-600 font-bold shrink-0">
                              <span className="text-xs text-slate-500 font-semibold">pays</span>
                              <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-slate-950 font-black px-3 py-1 bg-amber-100 rounded-lg border border-amber-300 text-xs shadow-2xs leading-normal inline-block">
                                {flow.amount.toFixed(2)} {group.currency}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 min-w-0 justify-end">
                              <span className="font-bold text-emerald-700 text-xs leading-normal text-right">
                                {flow.toMemberName} <span className="text-slate-500 font-medium text-[11px]">(Receiver)</span>
                              </span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700 font-bold p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        ✓ All member balances are fully settled in this cycle.
                      </p>
                    )}
                  </div>

                  {/* Document Signatures & Stamp */}
                  <div className="pt-5 border-t border-slate-200 flex items-end justify-between gap-4 text-xs text-slate-600">
                    <div>
                      <p className="font-bold text-slate-800">Verified & Approved By:</p>
                      <p className="mt-6 border-t border-slate-400 pt-1 font-semibold text-slate-700">
                        Room Manager Signature
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md font-black text-xs uppercase tracking-wider">
                        OFFICIAL MESS AUDIT STAMP
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 font-medium">
                        Generated by Room Suite Portal
                      </p>
                    </div>
                  </div>

                  {/* Developer / Application Creator Footer */}
                  <div className="pt-3 border-t border-slate-200 text-center text-slate-700 text-xs font-bold leading-normal space-y-0.5">
                    <p>This application created by AL AMIN</p>
                    <p>Mobile No. +971 54 487 4028</p>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
