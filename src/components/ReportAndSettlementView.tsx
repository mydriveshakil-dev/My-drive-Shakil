import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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

  // Generate PDF file using html2canvas and jsPDF directly for cross-browser & Vercel deployment reliability
  const createPdfWithHtml2CanvasAndJsPdf = async (
    element: HTMLElement,
    fileName: string,
    autoDownload = false
  ): Promise<File | null> => {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: sanitizeDocumentForHtml2Canvas,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 5;
      const contentWidth = pageWidth - margin * 2; // 200 mm
      const maxContentHeight = pageHeight - margin * 2; // 287 mm

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= maxContentHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= maxContentHeight;
      }

      if (autoDownload) {
        pdf.save(fileName);
      }

      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      return file;
    } catch (err) {
      console.error('html2canvas + jsPDF generation error:', err);
      return null;
    }
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
        const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;
        const file = await createPdfWithHtml2CanvasAndJsPdf(element, fileName, false);
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
      const origReport = document.getElementById('pdf-report-document');
      const clonedReport = clonedDoc.getElementById('pdf-report-document');

      if (origReport && clonedReport) {
        // Set fixed width and container styling for A4 canvas rendering
        clonedReport.style.width = '794px';
        clonedReport.style.maxWidth = '794px';
        clonedReport.style.margin = '0 auto';
        clonedReport.style.backgroundColor = '#ffffff';
        clonedReport.style.boxSizing = 'border-box';

        const origElements = [origReport, ...Array.from(origReport.querySelectorAll('*'))];
        const clonedElements = [clonedReport, ...Array.from(clonedReport.querySelectorAll('*'))];

        for (let i = 0; i < origElements.length; i++) {
          const orig = origElements[i] as HTMLElement;
          const clone = clonedElements[i] as HTMLElement;
          if (!orig || !clone) continue;

          try {
            const comp = window.getComputedStyle(orig);

            // Copy essential layout & display properties
            clone.style.display = comp.display;
            if (comp.display === 'flex' || comp.display === 'inline-flex') {
              clone.style.flexDirection = comp.flexDirection;
              clone.style.alignItems = comp.alignItems;
              clone.style.justifyContent = comp.justifyContent;
              clone.style.flexWrap = comp.flexWrap;
              clone.style.flexShrink = comp.flexShrink;
              clone.style.flexGrow = comp.flexGrow;
              clone.style.gap = comp.gap;
            } else if (comp.display === 'grid' || comp.display === 'inline-grid') {
              clone.style.gridTemplateColumns = comp.gridTemplateColumns;
              clone.style.gap = comp.gap;
            }

            // Colors & Backgrounds
            clone.style.backgroundColor = comp.backgroundColor;
            clone.style.color = comp.color;

            // Typography
            clone.style.fontFamily = 'Arial, Helvetica, sans-serif';
            clone.style.fontSize = comp.fontSize;
            clone.style.fontWeight = comp.fontWeight;
            clone.style.lineHeight = comp.lineHeight;
            clone.style.textAlign = comp.textAlign;
            clone.style.textTransform = comp.textTransform;

            // Padding & Margin
            clone.style.paddingTop = comp.paddingTop;
            clone.style.paddingRight = comp.paddingRight;
            clone.style.paddingBottom = comp.paddingBottom;
            clone.style.paddingLeft = comp.paddingLeft;

            clone.style.marginTop = comp.marginTop;
            clone.style.marginRight = comp.marginRight;
            clone.style.marginBottom = comp.marginBottom;
            clone.style.marginLeft = comp.marginLeft;

            // Borders
            clone.style.borderTopWidth = comp.borderTopWidth;
            clone.style.borderTopStyle = comp.borderTopStyle;
            clone.style.borderTopColor = comp.borderTopColor;

            clone.style.borderRightWidth = comp.borderRightWidth;
            clone.style.borderRightStyle = comp.borderRightStyle;
            clone.style.borderRightColor = comp.borderRightColor;

            clone.style.borderBottomWidth = comp.borderBottomWidth;
            clone.style.borderBottomStyle = comp.borderBottomStyle;
            clone.style.borderBottomColor = comp.borderBottomColor;

            clone.style.borderLeftWidth = comp.borderLeftWidth;
            clone.style.borderLeftStyle = comp.borderLeftStyle;
            clone.style.borderLeftColor = comp.borderLeftColor;

            clone.style.borderRadius = comp.borderRadius;
            clone.style.boxSizing = 'border-box';
          } catch (e) {
            // Ignore individual node compute style errors
          }
        }
      }

      // Sanitize any inline styles or remaining style tags
      const styles = clonedDoc.querySelectorAll('style');
      styles.forEach((s) => {
        if (s.textContent) {
          s.textContent = sanitizeCssText(s.textContent);
        }
      });
    } catch (e) {
      console.warn('Sanitize document for html2canvas failed:', e);
    }
  };

  const handlePrintPdf = async () => {
    const fileName = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Settlement_Report_${fromDate}_to_${toDate}.pdf`;

    const element = document.getElementById('pdf-report-document');
    if (!element) {
      window.print();
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const file = await createPdfWithHtml2CanvasAndJsPdf(element, fileName, true);
      if (!file) {
        window.print();
        return;
      }
    } catch (err) {
      console.error('PDF export error, falling back to window.print():', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const summaryText = `📋 *${group.name} - Settlement Report*\n📅 Period: ${fromDate} to ${toDate}\n\n💰 Grand Total: ${settlementResult.grandTotalExpenses.toFixed(2)} ${group.currency}\n\n*Settlement Transactions:*\n${
      settlementResult.settlementFlows.length > 0
        ? settlementResult.settlementFlows
            .map((f) => `• ${f.fromMemberName} pays ${f.toMemberName}: ${f.amount.toFixed(2)} ${group.currency}`)
            .join('\n')
        : 'All balances cleared!'
    }`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`;
    window.open(whatsappUrl, '_blank');
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

    setIsSharingPdf(true);

    try {
      let targetFile = cachedPdfFileRef.current;

      if (!targetFile) {
        const element = document.getElementById('pdf-report-document');
        if (element) {
          targetFile = await createPdfWithHtml2CanvasAndJsPdf(element, fileName, false);
          if (targetFile) {
            cachedPdfFileRef.current = targetFile;
          }
        }
      }

      // 1. Web Share API with PDF file (Supported mobile browsers & devices)
      if (
        targetFile &&
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [targetFile] })
      ) {
        try {
          await navigator.share({
            title: `${group.name} Settlement Report`,
            text: `Here is the settlement report for ${group.name} (${fromDate} to ${toDate}).`,
            files: [targetFile],
          });
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
          console.warn('Native PDF file share failed, trying text share fallback:', shareErr);
        }
      }

      // 2. Web Share API with text summary (Mobile browsers text share sheet)
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: `${group.name} Settlement Report`,
            text: summaryText,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
        }
      }

      // 3. Desktop / Clipboard fallback: Copy text to clipboard and open WhatsApp
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(summaryText);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000);
        } catch (clipErr) {
          console.warn('Clipboard write failed:', clipErr);
        }
      }

      handleShareWhatsApp();
    } catch (e) {
      console.warn('Fallback share error:', e);
      handleShareWhatsApp();
    } finally {
      setIsSharingPdf(false);
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

      {/* Date Picker & Compact Include Categories in 1 Line */}
      <div className="p-4 border border-slate-200 bg-white text-slate-900 shadow-xs space-y-3 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
            <Calendar className="w-3.5 h-3.5 text-[#0052FF]" />
            <span>Settlement Period Range:</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none"
            />
            <span className="text-slate-500 font-bold">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Checkboxes in 1 compact line */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider shrink-0">
            Include Categories:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'mess', label: 'Mess' },
              { key: 'general', label: 'General' },
              { key: 'utilities', label: 'Utilities' },
            ].map(({ key, label }) => {
              const isChecked = includeCategories[key as keyof typeof includeCategories];
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key as keyof typeof includeCategories)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-[#0052FF] text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 1: Member-wise Calculation Breakdown */}
      <div className="p-4 border border-slate-200 bg-white text-slate-900 shadow-xs space-y-3 rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#0052FF]" />
            Member-wise Calculation Breakdown
          </h3>
          <span className="text-[11px] text-slate-500 font-semibold">
            Equal Split Mode
          </span>
        </div>

        {/* Member Calculation Cards with 3 Side-by-Side Boxes (Actual Share, Amount Paid, Final Status) */}
        <div className="space-y-2">
          {settlementResult.memberSummaries.map((ms) => {
            const isOverpaid = ms.balance >= 0;
            return (
              <div
                key={ms.memberId}
                className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-900"
              >
                <div className="font-extrabold text-xs sm:text-sm text-[#07193F] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0052FF]" />
                  <span>{ms.memberName}</span>
                </div>

                {/* 3 Small Boxes Side-by-Side in 1 Alignment */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 text-center shadow-2xs">
                    <span className="text-slate-500 block text-[9px] sm:text-[10px] font-extrabold uppercase">Per Person Cost</span>
                    <span className="font-black text-slate-900 block mt-0.5">{ms.totalActualExpense.toFixed(2)} {group.currency}</span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200 text-center shadow-2xs">
                    <span className="text-slate-500 block text-[9px] sm:text-[10px] font-extrabold uppercase">Amount Paid</span>
                    <span className="font-black text-slate-900 block mt-0.5">{ms.totalAmountSpent.toFixed(2)} {group.currency}</span>
                  </div>

                  <div
                    className={`p-2 rounded-xl border text-center shadow-2xs ${
                      isOverpaid
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                        : 'bg-rose-50 text-rose-950 border-rose-300'
                    }`}
                  >
                    <span className="block text-[9px] sm:text-[10px] font-extrabold uppercase opacity-80">Final Status</span>
                    <span className="font-black block mt-0.5 truncate">
                      {isOverpaid ? `+${ms.balance.toFixed(2)} (Gets)` : `${ms.balance.toFixed(2)} (Due)`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

                {/* WhatsApp Share Button */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md"
                  title="Share via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  <span className="hidden sm:inline">WhatsApp</span>
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
                        <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">
                          UAE MESS SYSTEM
                        </h1>
                        <p className="text-xs text-slate-900 font-black uppercase tracking-wide leading-tight mt-0.5">
                          {group.name ? group.name.toUpperCase() : 'ROOM NO 3'}
                        </p>
                        <p className="text-xs text-emerald-800 font-extrabold uppercase tracking-wide leading-tight mt-0.5">
                          SETTLEMENT STATEMENT
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
                            <th className="p-2.5 border-b border-r border-slate-200 text-right">Per Person Cost</th>
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
