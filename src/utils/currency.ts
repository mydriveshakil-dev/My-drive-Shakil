export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rateFromAED: number; // 1 AED = X units of target currency
}

export const DEFAULT_CURRENCIES: CurrencyInfo[] = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', rateFromAED: 1.0 },
  { code: 'USD', name: 'US Dollar', symbol: '$', rateFromAED: 0.2723 },
  { code: 'EUR', name: 'Euro', symbol: '€', rateFromAED: 0.2512 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rateFromAED: 0.2145 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateFromAED: 22.75 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rateFromAED: 32.50 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', rateFromAED: 75.80 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', rateFromAED: 1.021 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', rateFromAED: 0.372 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rateFromAED: 0.415 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', rateFromAED: 15.85 },
];

export function getCurrencySymbol(currencyCode: string = 'AED'): string {
  if (currencyCode === 'AED') return 'AED';
  const found = DEFAULT_CURRENCIES.find((c) => c.code === currencyCode);
  return found?.symbol || currencyCode;
}

export function convertAmount(
  amount: number,
  fromCode: string = 'AED',
  toCode: string = 'USD',
  customRates?: Record<string, number>
): number {
  if (fromCode === toCode) return amount;

  const fromInfo = DEFAULT_CURRENCIES.find((c) => c.code === fromCode);
  const toInfo = DEFAULT_CURRENCIES.find((c) => c.code === toCode);

  const fromRate = customRates?.[fromCode] ?? (fromInfo ? fromInfo.rateFromAED : 1.0);
  const toRate = customRates?.[toCode] ?? (toInfo ? toInfo.rateFromAED : 1.0);

  if (fromRate === 0) return 0;

  // Convert to AED base, then to target currency
  const amountInAED = amount / fromRate;
  return amountInAED * toRate;
}

export function formatCurrencyAmount(
  amount: number,
  currencyCode: string
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedNumber = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = amount < 0 ? '-' : '';

  if (currencyCode === 'AED') {
    return `${sign}${formattedNumber} AED`;
  }
  return `${sign}${symbol}${formattedNumber} ${currencyCode}`;
}

export function getDualCurrencyDetails(
  amount: number,
  baseCurrency: string = 'AED',
  preferredCurrency: string = 'USD',
  customRates?: Record<string, number>
) {
  const isSame = baseCurrency === preferredCurrency;
  const converted = convertAmount(amount, baseCurrency, preferredCurrency, customRates);

  return {
    baseFormatted: formatCurrencyAmount(amount, baseCurrency),
    preferredFormatted: formatCurrencyAmount(converted, preferredCurrency),
    convertedAmount: converted,
    isSameCurrency: isSame,
    preferredCurrencyCode: preferredCurrency,
    preferredSymbol: DEFAULT_CURRENCIES.find((c) => c.code === preferredCurrency)?.symbol || preferredCurrency,
  };
}
