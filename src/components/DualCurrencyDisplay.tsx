import React from 'react';
import { getDualCurrencyDetails } from '../utils/currency';

interface DualCurrencyDisplayProps {
  amount: number;
  baseCurrency?: string;
  preferredCurrency?: string;
  className?: string;
  baseClassName?: string;
  preferredClassName?: string;
  layout?: 'inline' | 'stacked' | 'pill' | 'hero';
  customRates?: Record<string, number>;
}

export const DualCurrencyDisplay: React.FC<DualCurrencyDisplayProps> = ({
  amount,
  baseCurrency = 'AED',
  preferredCurrency = 'USD',
  className = '',
  baseClassName = '',
  preferredClassName = '',
  layout = 'inline',
  customRates,
}) => {
  const details = getDualCurrencyDetails(amount, baseCurrency, preferredCurrency, customRates);

  if (details.isSameCurrency) {
    return <span className={`${baseClassName} ${className}`}>{details.baseFormatted}</span>;
  }

  if (layout === 'hero') {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className={`flex items-baseline gap-2 ${baseClassName}`}>
          <span>{details.baseFormatted}</span>
        </div>
        <div className={`text-xs md:text-sm text-[#F9A826] font-medium flex items-center gap-1 mt-0.5 ${preferredClassName}`}>
          <span className="bg-amber-400/20 px-2 py-0.5 rounded-md border border-amber-400/30 font-semibold">
            ≈ {details.preferredFormatted}
          </span>
        </div>
      </div>
    );
  }

  if (layout === 'stacked') {
    return (
      <div className={`flex flex-col ${className}`}>
        <span className={baseClassName}>{details.baseFormatted}</span>
        <span className={`text-[11px] font-medium text-amber-600/90 dark:text-amber-400/90 ${preferredClassName}`}>
          ≈ {details.preferredFormatted}
        </span>
      </div>
    );
  }

  if (layout === 'pill') {
    return (
      <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
        <span className={baseClassName}>{details.baseFormatted}</span>
        <span className={`inline-flex items-center text-[10px] font-semibold bg-amber-100/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 px-1.5 py-0.5 rounded-md border border-amber-300/40 ${preferredClassName}`}>
          ≈ {details.preferredFormatted}
        </span>
      </div>
    );
  }

  // Default 'inline'
  return (
    <span className={`inline-flex items-baseline gap-1.5 flex-wrap ${className}`}>
      <span className={baseClassName}>{details.baseFormatted}</span>
      <span className={`text-[11px] font-normal text-amber-700/80 dark:text-amber-300/80 ${preferredClassName}`}>
        (≈ {details.preferredFormatted})
      </span>
    </span>
  );
};
