import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { LOCALE, CURRENCY_CODE, CURRENCY_SYMBOL } from '../config/app';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Compact currency for chart axes: ₦1.4k, ₦2.3M */
export const formatCurrencyShort = (amount: number): string => {
  if (amount >= 1_000_000) return `${CURRENCY_SYMBOL}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${CURRENCY_SYMBOL}${(amount / 1_000).toFixed(0)}k`;
  return `${CURRENCY_SYMBOL}${amount}`;
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};