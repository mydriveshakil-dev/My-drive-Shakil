export interface MathEvalResult {
  hasOperator: boolean;
  isValid: boolean;
  calculatedValue: number | null;
  displayValue: string;
}

/**
 * Safely evaluates mathematical expressions like "10+20+30", "15.5*2", "100/4", "50-10+5".
 */
export function evaluateMathExpression(input: string): MathEvalResult {
  if (!input || !input.trim()) {
    return {
      hasOperator: false,
      isValid: false,
      calculatedValue: null,
      displayValue: '',
    };
  }

  // Replace commas with dots and trim
  const normalized = input.replace(/,/g, '.').trim();

  // Check if expression contains math operators (+, -, *, /)
  const hasOperator = /[+\-*/]/.test(normalized);

  // Validate allowed characters strictly: digits, +, -, *, /, ., (, ), spaces
  if (!/^[0-9+\-*/.()\s]+$/.test(normalized)) {
    return {
      hasOperator,
      isValid: false,
      calculatedValue: null,
      displayValue: input,
    };
  }

  // Simple pure number check
  if (!hasOperator && /^\d+(\.\d+)?$/.test(normalized)) {
    const val = parseFloat(normalized);
    return {
      hasOperator: false,
      isValid: !isNaN(val) && val >= 0,
      calculatedValue: isNaN(val) ? null : val,
      displayValue: normalized,
    };
  }

  try {
    // Safe evaluation after strict regex validation
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${normalized})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      const rounded = Math.round(result * 100) / 100;
      return {
        hasOperator,
        isValid: rounded >= 0,
        calculatedValue: rounded,
        displayValue: rounded.toString(),
      };
    }
  } catch {
    // Syntax error in user's typed expression
  }

  return {
    hasOperator,
    isValid: false,
    calculatedValue: null,
    displayValue: input,
  };
}
