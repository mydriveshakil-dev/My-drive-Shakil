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

  return <span className={`${baseClassName} ${className}`}>{details.baseFormatted}</span>;
};
