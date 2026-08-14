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

// Helper to get current month first and last date in YYYY-MM-DD format
const getCurrentMonthDateRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const firstDay = `${year}-${month}-01`;
  const lastDayNumber = new Date(year, now.getMonth() + 1, 0).getDate();
  const lastDay = `${year}-${month}-${String(lastDayNumber).padStart(2, '0')}`;
  return { fromDate: firstDay, toDate: lastDay };
};

export const ReportAndSettlementView: React.FC<ReportAndSettlementViewProps> = ({
  group,
  expenses,
  utilities,
  rent,
  onSaveSettlement,
  preferredCurrency = 'USD',
  customRates,
}) => {
  const [fromDate, setFromDate] = useState(() => getCurrentMonthDateRange().fromDate);
  const [toDate, setToDate] = useState(() => getCurrentMonthDateRange().toDate);
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
    expensesSummary: false,
  });

  // Filter expenses and utilities by selected date range
  const filteredExpensesByDate = expenses.filter((e) => {
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    return true;
  });

  const filteredUtilitiesByDate = utilities.filter((u) => {
    if (fromDate && u.date && u.date < fromDate) return false;
    if (toDate && u.date && u.date > toDate) return false;
    return true;
  });

  const settlementResult = calculateSettlement(
    group.members,
    filteredExpensesByDate,
    filteredUtilitiesByDate,
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

      const pageWidth = 210; // Standard A4 width (mm)
      const pageHeight = 297; // Standard A4 height (mm)

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Render page 1
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Render subsequent pages for standard A4
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage('a4', 'portrait');
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
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

  // Helper to convert oklch color string to rgb/rgba format for html2canvas compatibility
  const oklchToRgb = (oklchStr: string): string => {
    if (!oklchStr || typeof oklchStr !== 'string') return oklchStr;

    return oklchStr.replace(/oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi, (_, p1, p2, p3, p4) => {
      let L = parseFloat(p1);
      if (p1.endsWith('%')) L /= 100;

      const C = parseFloat(p2);
      const H_deg = parseFloat(p3);
      let alpha = 1;
      if (p4) {
        alpha = parseFloat(p4);
        if (p4.endsWith('%')) alpha /= 100;
      }

      const H_rad = (H_deg * Math.PI) / 180;
      const a = C * Math.cos(H_rad);
      const b = C * Math.sin(H_rad);

      const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = L - 0.0894841775 * a - 1.291485548 * b;

      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;

      const r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      const g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      const b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

      const toSrgb = (c: number) => {
        if (c <= 0) return 0;
        if (c >= 1) return 255;
        const abs = Math.abs(c);
        const compressed = abs <= 0.0031308 ? 12.92 * abs : 1.055 * Math.pow(abs, 1 / 2.4) - 0.055;
        return Math.min(255, Math.max(0, Math.round(compressed * 255)));
      };

      const r = toSrgb(r_lin);
      const g = toSrgb(g_lin);
      const b_val = toSrgb(b_lin);

      if (alpha < 1) {
        return `rgba(${r}, ${g}, ${b_val}, ${alpha})`;
      }
      return `rgb(${r}, ${g}, ${b_val})`;
    });
  };

  const sanitizeCssText = (text: string): string => {
    if (!text) return text;
    let css = text;

    css = css.replace(/\bin\s+(oklab|oklch)\b/gi, 'in srgb');
    css = oklchToRgb(css);

    // Fallback for remaining color-mix or light-dark if any
    css = css.replace(/color-mix\([^)]+\)/gi, 'inherit');
    css = css.replace(/light-dark\(([^,]+),[^)]+\)/gi, '$1');

    return css;
  };

  const sanitizeDocumentForHtml2Canvas = (clonedDoc: Document) => {
    try {
      const origReport = document.getElementById('pdf-report-document');
      const clonedReport = clonedDoc.getElementById('pdf-report-document');

      const sanitizeColor = (colorStr: string): string => {
        if (!colorStr) return colorStr;
        if (colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return 'transparent';
        if (colorStr.includes('oklch')) {
          return oklchToRgb(colorStr);
        }
        if (colorStr.includes('color-mix') || colorStr.includes('light-dark')) {
          return sanitizeCssText(colorStr);
        }
        return colorStr;
      };

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
            clone.style.backgroundColor = sanitizeColor(comp.backgroundColor);
            clone.style.color = sanitizeColor(comp.color);

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
            clone.style.borderTopColor = sanitizeColor(comp.borderTopColor);

            clone.style.borderRightWidth = comp.borderRightWidth;
            clone.style.borderRightStyle = comp.borderRightStyle;
            clone.style.borderRightColor = sanitizeColor(comp.borderRightColor);

            clone.style.borderBottomWidth = comp.borderBottomWidth;
            clone.style.borderBottomStyle = comp.borderBottomStyle;
            clone.style.borderBottomColor = sanitizeColor(comp.borderBottomColor);

            clone.style.borderLeftWidth = comp.borderLeftWidth;
            clone.style.borderLeftStyle = comp.borderLeftStyle;
            clone.style.borderLeftColor = sanitizeColor(comp.borderLeftColor);

            clone.style.borderRadius = comp.borderRadius;
            clone.style.boxSizing = 'border-box';
          } catch (e) {
            // Ignore individual node compute style errors
          }
        }
      }

      // Sanitize all style tags in the cloned document
      const styles = clonedDoc.querySelectorAll('style');
      styles.forEach((s) => {
        if (s.textContent) {
          s.textContent = sanitizeCssText(s.textContent);
        }
      });

      // Also check inline style attributes on cloned elements
      const allCloned = clonedDoc.querySelectorAll('*');
      allCloned.forEach((el) => {
        if (el instanceof HTMLElement && el.hasAttribute('style')) {
          const styleAttr = el.getAttribute('style');
          if (
            styleAttr &&
            (styleAttr.includes('oklch') ||
              styleAttr.includes('oklab') ||
              styleAttr.includes('color-mix') ||
              styleAttr.includes('light-dark'))
          ) {
            el.setAttribute('style', sanitizeCssText(styleAttr));
          }
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfPreviewOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 border border-white/20 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Export PDF</span>
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
              { key: 'expensesSummary', label: 'Expenses Summary' },
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
                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShareReport}
                  disabled={isSharingPdf || isGeneratingPdf}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-700 transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-md"
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
                      <span className="text-xs font-black">Share</span>
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
                  className="bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10 w-[210mm] max-w-full min-h-[297mm] mx-auto space-y-4 sm:space-y-6 text-xs font-sans border-2 border-slate-900 box-border relative"
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#0f172a' }}
                >
                  {/* Header Stamp & Title */}
                  <div className="border-b-2 border-slate-900 pb-4 flex flex-row items-center justify-between gap-3" style={{ borderColor: '#0f172a' }}>
                    <div className="flex items-center gap-3">
                      <img
                        src={uaeMessLogo}
                        alt="UAE MESS SYSTEM Logo"
                        className="w-12 h-12 rounded-xl object-cover border-2 border-amber-500/80 shadow-md shrink-0"
                        style={{ borderColor: '#f59e0b' }}
                      />
                      <div>
                        <h1 className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight" style={{ color: '#0f172a' }}>
                          UAE MESS SYSTEM
                        </h1>
                        <p className="text-xs font-black uppercase tracking-wide leading-tight mt-0.5" style={{ color: '#0f172a' }}>
                          {group.name ? group.name.toUpperCase() : 'ROOM NO 3'}
                        </p>
                        <p className="text-xs font-extrabold uppercase tracking-wide leading-tight mt-0.5" style={{ color: '#065f46' }}>
                          SETTLEMENT STATEMENT
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-medium p-2.5 rounded-xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
                      <p className="font-bold text-xs" style={{ color: '#0f172a' }}>Group: {group.name}</p>
                      <p className="leading-normal">
                        Settlement Period:{' '}
                        <strong style={{ color: '#047857' }}>{fromDate}</strong> to{' '}
                        <strong style={{ color: '#047857' }}>{toDate}</strong>
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
                    <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                        Total Mess Expense
                      </span>
                      <div className="text-base font-black my-1 leading-snug" style={{ color: '#0f172a' }}>
                        {settlementResult.totalMessExpenses.toFixed(2)} {group.currency}
                      </div>
                      <span className="text-[10px] font-medium leading-normal" style={{ color: '#64748b' }}>
                        Shared equally
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                        General Expense
                      </span>
                      <div className="text-base font-black my-1 leading-snug" style={{ color: '#0f172a' }}>
                        {settlementResult.totalGeneralExpenses.toFixed(2)} {group.currency}
                      </div>
                      <span className="text-[10px] font-medium leading-normal" style={{ color: '#64748b' }}>
                        Shared equally
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                        Utilities (DEWA & WiFi)
                      </span>
                      <div className="text-base font-black my-1 leading-snug" style={{ color: '#0f172a' }}>
                        {settlementResult.totalUtilities.toFixed(2)} {group.currency}
                      </div>
                      <span className="text-[10px] font-medium leading-normal" style={{ color: '#64748b' }}>
                        DEWA, WiFi Bills
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: '#ecfdf5', borderColor: '#6ee7b7' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#065f46' }}>
                        Grand Total
                      </span>
                      <div className="text-base font-black my-1 leading-snug" style={{ color: '#022c22' }}>
                        {settlementResult.grandTotalExpenses.toFixed(2)} {group.currency}
                      </div>
                      <span className="text-[10px] font-semibold leading-normal" style={{ color: '#047857' }}>
                        {group.members.length} Members
                      </span>
                    </div>
                  </div>

                  {/* Member-wise Calculation Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider pb-1.5 border-b flex items-center justify-between" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>
                      <span>1. Member-wise Calculation Breakdown</span>
                      <span className="font-normal text-xs" style={{ color: '#64748b' }}>
                        Split Mode: Equal Split
                      </span>
                    </h3>

                    <div className="w-full rounded-xl border shadow-xs overflow-hidden" style={{ borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="uppercase font-bold text-[10px] tracking-wider" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                            <th className="p-2.5 border-b border-r" style={{ borderColor: '#e2e8f0' }}>Member</th>
                            <th className="p-2.5 border-b border-r text-right" style={{ borderColor: '#e2e8f0' }}>Per Person Cost</th>
                            <th className="p-2.5 border-b border-r text-right" style={{ borderColor: '#e2e8f0' }}>Amount Paid</th>
                            <th className="p-2.5 border-b text-right" style={{ borderColor: '#e2e8f0' }}>Final Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-medium text-xs" style={{ borderColor: '#e2e8f0' }}>
                          {settlementResult.memberSummaries.map((ms, idx) => {
                            const isOverpaid = ms.balance >= 0;
                            return (
                              <tr key={ms.memberId} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                <td className="p-2.5 border-r font-bold leading-normal" style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>
                                  {ms.memberName}
                                </td>
                                <td className="p-2.5 border-r text-right leading-normal" style={{ borderColor: '#e2e8f0', color: '#334155' }}>
                                  {ms.totalActualExpense.toFixed(2)} {group.currency}
                                </td>
                                <td className="p-2.5 border-r text-right font-bold leading-normal" style={{ borderColor: '#e2e8f0', color: '#b45309' }}>
                                  {ms.totalAmountSpent.toFixed(2)} {group.currency}
                                </td>
                                <td className="p-2.5 text-right font-black leading-normal">
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
                  </div>

                  {/* Simplified Debt Settlement Flow Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider pb-1.5 border-b" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>
                      2. Simplified Debt Settlement Transactions
                    </h3>

                    {settlementResult.settlementFlows.length > 0 ? (
                      <div className="space-y-2">
                        {settlementResult.settlementFlows.map((flow) => (
                          <div
                            key={flow.id}
                            className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs"
                            style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#f43f5e' }}></span>
                              <span className="font-bold text-xs leading-normal" style={{ color: '#be123c' }}>
                                {flow.fromMemberName} <span className="font-medium text-[11px]" style={{ color: '#64748b' }}>(Payer)</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 font-bold shrink-0" style={{ color: '#475569' }}>
                              <span className="text-xs font-semibold" style={{ color: '#64748b' }}>pays</span>
                              <ArrowRight className="w-4 h-4 shrink-0" style={{ color: '#059669' }} />
                              <span className="font-black px-3 py-1 rounded-lg border text-xs shadow-2xs leading-normal inline-block" style={{ backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#020617' }}>
                                {flow.amount.toFixed(2)} {group.currency}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 min-w-0 justify-end">
                              <span className="font-bold text-xs leading-normal text-right" style={{ color: '#047857' }}>
                                {flow.toMemberName} <span className="font-medium text-[11px]" style={{ color: '#64748b' }}>(Receiver)</span>
                              </span>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#10b981' }}></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-bold p-3 rounded-xl border" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
                        ✓ All member balances are fully settled in this cycle.
                      </p>
                    )}
                  </div>

                  {/* Utility Bills Breakdown Section */}
                  {includeCategories.utilities && (
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1.5 border-b flex items-center justify-between" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>
                        <span>3. Utility Bills Breakdown (DEWA & WiFi)</span>
                        <span className="font-normal text-[11px]" style={{ color: '#64748b' }}>
                          Total: {settlementResult.totalUtilities.toFixed(2)} {group.currency}
                        </span>
                      </h3>
                      {filteredUtilitiesByDate && filteredUtilitiesByDate.length > 0 ? (
                        <div className="w-full rounded-xl border shadow-xs overflow-hidden" style={{ borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="uppercase font-bold text-[10px] tracking-wider" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                                <th className="p-2 border-b border-r" style={{ borderColor: '#e2e8f0' }}>Utility Name</th>
                                <th className="p-2 border-b border-r" style={{ borderColor: '#e2e8f0' }}>Date / Cycle</th>
                                <th className="p-2 border-b border-r text-right" style={{ borderColor: '#e2e8f0' }}>Amount</th>
                                <th className="p-2 border-b text-center" style={{ borderColor: '#e2e8f0' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-medium text-[11px]" style={{ borderColor: '#e2e8f0' }}>
                              {filteredUtilitiesByDate.map((u, idx) => {
                                const isPaid = u.status === 'paid';
                                return (
                                  <tr key={u.id} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                    <td className="p-2 border-r font-bold" style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>{u.name || u.category || 'Utility'}</td>
                                    <td className="p-2 border-r" style={{ borderColor: '#e2e8f0', color: '#475569' }}>{u.dueDate || u.cycle || 'Current'}</td>
                                    <td className="p-2 border-r text-right font-black" style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>{u.amount.toFixed(2)} {group.currency}</td>
                                    <td className="p-2 text-center font-bold">
                                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={isPaid ? { backgroundColor: '#d1fae5', color: '#065f46' } : { backgroundColor: '#fef3c7', color: '#92400e' }}>
                                        {isPaid ? 'PAID' : 'PENDING'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-[11px] italic p-2 rounded-lg border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}>
                          No utility bills recorded for this period.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Itemized Billing Cycle Expenses Breakdown */}
                  {includeCategories.expensesSummary && (
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1.5 border-b flex items-center justify-between" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>
                        <span>4. Current Cycle Expenses Summary</span>
                        <span className="font-normal text-[11px]" style={{ color: '#64748b' }}>
                          Total: {settlementResult.totalMessExpenses.toFixed(2)} {group.currency}
                        </span>
                      </h3>
                      {filteredExpensesByDate && filteredExpensesByDate.length > 0 ? (
                        <div className="w-full rounded-xl border shadow-xs overflow-hidden" style={{ borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="uppercase font-bold text-[10px] tracking-wider" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                                <th className="p-2 border-b border-r" style={{ borderColor: '#e2e8f0' }}>Date</th>
                                <th className="p-2 border-b border-r" style={{ borderColor: '#e2e8f0' }}>Title</th>
                                <th className="p-2 border-b border-r" style={{ borderColor: '#e2e8f0' }}>Category</th>
                                <th className="p-2 border-b border-r" style={{ borderColor: '#e2e8f0' }}>Paid By</th>
                                <th className="p-2 border-b text-right" style={{ borderColor: '#e2e8f0' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-medium text-[11px]" style={{ borderColor: '#e2e8f0' }}>
                              {filteredExpensesByDate.slice(0, 20).map((e, idx) => (
                                <tr key={e.id} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                  <td className="p-2 border-r" style={{ borderColor: '#e2e8f0', color: '#475569' }}>{e.date}</td>
                                  <td className="p-2 border-r font-bold" style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>{e.title}</td>
                                  <td className="p-2 border-r uppercase text-[10px]" style={{ borderColor: '#e2e8f0', color: '#475569' }}>{e.category || 'Mess'}</td>
                                  <td className="p-2 border-r font-semibold" style={{ borderColor: '#e2e8f0', color: '#1e293b' }}>{e.paidByName || 'Member'}</td>
                                  <td className="p-2 text-right font-black" style={{ color: '#0f172a' }}>{e.amount.toFixed(2)} {group.currency}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filteredExpensesByDate.length > 20 && (
                            <p className="text-[10px] italic p-1.5 text-center" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                              Showing 20 of {filteredExpensesByDate.length} expenses in statement report.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] italic p-2 rounded-lg border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}>
                          No individual expenses recorded for this period.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Document Signatures & Stamp */}
                  <div className="pt-5 border-t flex items-end justify-between gap-4 text-xs" style={{ borderColor: '#e2e8f0', color: '#475569' }}>
                    <div>
                      <p className="font-bold" style={{ color: '#1e293b' }}>Verified & Approved By:</p>
                      <p className="mt-6 border-t pt-1 font-semibold" style={{ borderColor: '#94a3b8', color: '#334155' }}>
                        Room Manager Signature
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 rounded-md font-black text-xs uppercase tracking-wider border" style={{ backgroundColor: '#d1fae5', borderColor: '#6ee7b7', color: '#064e3b' }}>
                        OFFICIAL MESS AUDIT STAMP
                      </div>
                      <p className="mt-1 text-[10px] font-medium" style={{ color: '#94a3b8' }}>
                        Generated by Room Suite Portal
                      </p>
                    </div>
                  </div>

                  {/* Developer / Application Creator Footer */}
                  <div className="pt-3 border-t text-center text-xs font-bold leading-normal space-y-0.5" style={{ borderColor: '#e2e8f0', color: '#334155' }}>
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
