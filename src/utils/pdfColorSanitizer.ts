/**
 * Robust Color Sanitizer and Fallback Converter for html2canvas & jsPDF
 * Resolves modern CSS color spaces (oklab, oklch, lab, lch, color(srgb...))
 * which are unsupported by html2canvas and cause runtime generation errors.
 */

// Helper to parse numbers, scientific notation, percentages, or 'none'
export function parseNumberOrPercent(valStr: string, isPercentScale100 = false): number {
  if (!valStr) return 0;
  const trimmed = valStr.trim();
  if (trimmed === 'none') return 0;
  const isPercent = trimmed.endsWith('%');
  const num = parseFloat(trimmed);
  if (isNaN(num)) return 0;
  if (isPercent) return num / 100;
  if (isPercentScale100) return num / 100;
  return num;
}

// Helper to parse hue with degrees, radians, turns, gradians, or raw number
export function parseHue(hueStr: string): number {
  if (!hueStr) return 0;
  const trimmed = hueStr.trim();
  if (trimmed === 'none') return 0;
  if (trimmed.endsWith('deg')) return parseFloat(trimmed);
  if (trimmed.endsWith('rad')) return (parseFloat(trimmed) * 180) / Math.PI;
  if (trimmed.endsWith('grad')) return (parseFloat(trimmed) * 360) / 400;
  if (trimmed.endsWith('turn')) return parseFloat(trimmed) * 360;
  const num = parseFloat(trimmed);
  return isNaN(num) ? 0 : num;
}

/**
 * Convert Oklab color to sRGB string (rgb() or rgba())
 * L: [0, 1] lightness
 * a: [-0.4, 0.4] green-red
 * b: [-0.4, 0.4] blue-yellow
 */
export function oklabToRgb(L: number, a: number, b: number, alpha: number = 1): string {
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
    const formattedAlpha = Math.round(alpha * 1000) / 1000;
    return `rgba(${r}, ${g}, ${b_val}, ${formattedAlpha})`;
  }
  return `rgb(${r}, ${g}, ${b_val})`;
}

/**
 * Convert Oklch color to sRGB string
 * L: [0, 1] lightness
 * C: [0, 0.4+] chroma
 * H_deg: [0, 360] hue in degrees
 */
export function oklchToRgb(L: number, C: number, H_deg: number, alpha: number = 1): string {
  const H_rad = (H_deg * Math.PI) / 180;
  const a = C * Math.cos(H_rad);
  const b = C * Math.sin(H_rad);
  return oklabToRgb(L, a, b, alpha);
}

/**
 * Convert CIELAB (lab(L a b)) to sRGB
 */
export function labToRgb(L: number, a: number, b: number, alpha: number = 1): string {
  const y = (L + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;

  const fInv = (t: number) => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787);

  const X = 0.95047 * fInv(x);
  const Y = 1.0 * fInv(y);
  const Z = 1.08883 * fInv(z);

  const r_lin = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const g_lin = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  const b_lin = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  const toSrgb = (c: number) => {
    if (c <= 0) return 0;
    if (c >= 1) return 255;
    const compressed = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(compressed * 255)));
  };

  const r = toSrgb(r_lin);
  const g = toSrgb(g_lin);
  const b_val = toSrgb(b_lin);

  if (alpha < 1) {
    const formattedAlpha = Math.round(alpha * 1000) / 1000;
    return `rgba(${r}, ${g}, ${b_val}, ${formattedAlpha})`;
  }
  return `rgb(${r}, ${g}, ${b_val})`;
}

/**
 * Convert CIELCH (lch(L C H)) to sRGB
 */
export function lchToRgb(L: number, C: number, H_deg: number, alpha: number = 1): string {
  const H_rad = (H_deg * Math.PI) / 180;
  const a = C * Math.cos(H_rad);
  const b = C * Math.sin(H_rad);
  return labToRgb(L, a, b, alpha);
}

/**
 * Convert any CSS text containing modern/unsupported color formats to safe sRGB rgb()/rgba() format
 */
export function sanitizeCssText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let css = text;

  // 1. Replace oklab(...) - Handles space/comma separators, %, negative floats, / alpha
  css = css.replace(
    /oklab\(\s*([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))[\s,]+([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))[\s,]+([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))(?:\s*(?:\/|,)\s*([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none)))?\s*\)/gi,
    (_, p1, p2, p3, p4) => {
      const L = parseNumberOrPercent(p1, p1.includes('%'));
      const a = parseNumberOrPercent(p2);
      const b = parseNumberOrPercent(p3);
      const alpha = p4 ? parseNumberOrPercent(p4, p4.includes('%')) : 1;
      return oklabToRgb(L, a, b, alpha);
    }
  );

  // 2. Replace oklch(...) - Handles hue units (deg, rad, grad, turn), %, / alpha
  css = css.replace(
    /oklch\(\s*([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))[\s,]+([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))[\s,]+([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?(?:deg|rad|grad|turn)?%?|none))(?:\s*(?:\/|,)\s*([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none)))?\s*\)/gi,
    (_, p1, p2, p3, p4) => {
      const L = parseNumberOrPercent(p1, p1.includes('%'));
      const C = parseNumberOrPercent(p2);
      const H = parseHue(p3);
      const alpha = p4 ? parseNumberOrPercent(p4, p4.includes('%')) : 1;
      return oklchToRgb(L, C, H, alpha);
    }
  );

  // 3. Replace lab(...)
  css = css.replace(
    /lab\(\s*([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))[\s,]+([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))[\s,]+([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))(?:\s*(?:\/|,)\s*([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none)))?\s*\)/gi,
    (_, p1, p2, p3, p4) => {
      const L = parseNumberOrPercent(p1);
      const a = parseNumberOrPercent(p2);
      const b = parseNumberOrPercent(p3);
      const alpha = p4 ? parseNumberOrPercent(p4, p4.includes('%')) : 1;
      return labToRgb(L, a, b, alpha);
    }
  );

  // 4. Replace lch(...)
  css = css.replace(
    /lch\(\s*([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))[\s,]+([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none))[\s,]+([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?(?:deg|rad|grad|turn)?%?|none))(?:\s*(?:\/|,)\s*([+-]?(?:\d*\.?\d+(?:e[+-]?\d+)?%?|none)))?\s*\)/gi,
    (_, p1, p2, p3, p4) => {
      const L = parseNumberOrPercent(p1);
      const C = parseNumberOrPercent(p2);
      const H = parseHue(p3);
      const alpha = p4 ? parseNumberOrPercent(p4, p4.includes('%')) : 1;
      return lchToRgb(L, C, H, alpha);
    }
  );

  // 5. Replace color(srgb ...) and color(display-p3 ...)
  css = css.replace(
    /color\(\s*(?:srgb|display-p3)\s+([+-]?(?:\d*\.?\d+%?|none))\s+([+-]?(?:\d*\.?\d+%?|none))\s+([+-]?(?:\d*\.?\d+%?|none))(?:\s*(?:\/|,)\s*([+-]?(?:\d*\.?\d+%?|none)))?\s*\)/gi,
    (_, p1, p2, p3, p4) => {
      const r = Math.min(255, Math.max(0, Math.round(parseNumberOrPercent(p1) * 255)));
      const g = Math.min(255, Math.max(0, Math.round(parseNumberOrPercent(p2) * 255)));
      const b = Math.min(255, Math.max(0, Math.round(parseNumberOrPercent(p3) * 255)));
      const alpha = p4 ? parseNumberOrPercent(p4) : 1;
      if (alpha < 1) return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      return `rgb(${r}, ${g}, ${b})`;
    }
  );

  // 6. Light-dark, color-mix and interpolation cleanup
  css = css.replace(/light-dark\(\s*([^,)]+)\s*,\s*[^)]+\)/gi, '$1');
  css = css.replace(/color-mix\([^)]+\)/gi, '#071E55');
  css = css.replace(/\bin\s+(oklab|oklch|srgb|srgb-linear)\b/gi, 'in srgb');

  // 7. Ultimate safety fallback for any remaining unsupported color syntax
  if (css.includes('oklab(')) {
    css = css.replace(/oklab\([^)]*\)/gi, '#071E55');
  }
  if (css.includes('oklch(')) {
    css = css.replace(/oklch\([^)]*\)/gi, '#071E55');
  }

  return css;
}

/**
 * Sanitize a single CSS color value (computed style or attribute)
 */
export function sanitizeColorValue(val: string): string {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed === 'transparent' || trimmed === 'rgba(0, 0, 0, 0)') return 'transparent';
  if (
    trimmed.includes('oklab') ||
    trimmed.includes('oklch') ||
    trimmed.includes('lab(') ||
    trimmed.includes('lch(') ||
    trimmed.includes('color(') ||
    trimmed.includes('color-mix(') ||
    trimmed.includes('light-dark(')
  ) {
    return sanitizeCssText(trimmed);
  }
  return val;
}

/**
 * Prepares the cloned document for html2canvas to guarantee zero parse errors.
 */
export function sanitizeDocumentForHtml2Canvas(clonedDoc: Document): void {
  try {
    const origReport = document.getElementById('pdf-report-document');
    const clonedReport = clonedDoc.getElementById('pdf-report-document');

    if (origReport && clonedReport) {
      // Set fixed dimension and clear container styles
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

          // Copy layout properties
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

          // Convert all color properties to standard sRGB rgb/rgba/hex
          clone.style.backgroundColor = sanitizeColorValue(comp.backgroundColor);
          clone.style.color = sanitizeColorValue(comp.color);

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

          // Borders & Colors
          clone.style.borderTopWidth = comp.borderTopWidth;
          clone.style.borderTopStyle = comp.borderTopStyle;
          clone.style.borderTopColor = sanitizeColorValue(comp.borderTopColor);

          clone.style.borderRightWidth = comp.borderRightWidth;
          clone.style.borderRightStyle = comp.borderRightStyle;
          clone.style.borderRightColor = sanitizeColorValue(comp.borderRightColor);

          clone.style.borderBottomWidth = comp.borderBottomWidth;
          clone.style.borderBottomStyle = comp.borderBottomStyle;
          clone.style.borderBottomColor = sanitizeColorValue(comp.borderBottomColor);

          clone.style.borderLeftWidth = comp.borderLeftWidth;
          clone.style.borderLeftStyle = comp.borderLeftStyle;
          clone.style.borderLeftColor = sanitizeColorValue(comp.borderLeftColor);

          clone.style.borderRadius = comp.borderRadius;
          clone.style.boxSizing = 'border-box';

          // Box Shadow (strip or sanitize oklab/oklch if present)
          if (comp.boxShadow && comp.boxShadow !== 'none') {
            clone.style.boxShadow = sanitizeCssText(comp.boxShadow);
          }
        } catch {
          // Ignore individual node compute style errors
        }
      }
    }

    // Sanitize all style elements in cloned document
    const styles = clonedDoc.querySelectorAll('style');
    styles.forEach((s) => {
      if (s.textContent) {
        s.textContent = sanitizeCssText(s.textContent);
      }
    });

    // Sanitize any remaining inline styles on all cloned elements
    const allCloned = clonedDoc.querySelectorAll('*');
    allCloned.forEach((el) => {
      if (el instanceof HTMLElement && el.hasAttribute('style')) {
        const styleAttr = el.getAttribute('style');
        if (
          styleAttr &&
          (styleAttr.includes('oklch') ||
            styleAttr.includes('oklab') ||
            styleAttr.includes('color(') ||
            styleAttr.includes('color-mix') ||
            styleAttr.includes('light-dark'))
        ) {
          el.setAttribute('style', sanitizeCssText(styleAttr));
        }
      }
    });
  } catch (e) {
    console.warn('Sanitize document for html2canvas fallback warning:', e);
  }
}
