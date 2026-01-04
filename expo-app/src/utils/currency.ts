/**
 * Currency formatting utilities
 */

// Currency configuration
export const CURRENCY_CONFIG: Record<string, { symbol: string; position: 'before' | 'after'; decimals: number }> = {
    MYR: { symbol: 'RM', position: 'before', decimals: 2 },
    USD: { symbol: '$', position: 'before', decimals: 2 },
    SGD: { symbol: 'S$', position: 'before', decimals: 2 },
    EUR: { symbol: '€', position: 'before', decimals: 2 },
    GBP: { symbol: '£', position: 'before', decimals: 2 },
    AUD: { symbol: 'A$', position: 'before', decimals: 2 },
    JPY: { symbol: '¥', position: 'before', decimals: 0 },
    CNY: { symbol: '¥', position: 'before', decimals: 2 },
    INR: { symbol: '₹', position: 'before', decimals: 2 },
    THB: { symbol: '฿', position: 'before', decimals: 2 },
    IDR: { symbol: 'Rp', position: 'before', decimals: 0 },
    PHP: { symbol: '₱', position: 'before', decimals: 2 },
    VND: { symbol: '₫', position: 'after', decimals: 0 },
    KRW: { symbol: '₩', position: 'before', decimals: 0 },
    HKD: { symbol: 'HK$', position: 'before', decimals: 2 },
    TWD: { symbol: 'NT$', position: 'before', decimals: 0 },
};

/**
 * Format a number as currency
 */
export function formatCurrency(
    amount: number | string | null | undefined,
    currencyCode: string = 'MYR',
    options?: { showCode?: boolean; compact?: boolean }
): string {
    if (amount === null || amount === undefined) return '-';

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '-';

    const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.MYR;
    const { symbol, position, decimals } = config;

    // Format the number
    let formattedNumber: string;
    if (options?.compact && numAmount >= 1000) {
        if (numAmount >= 1000000) {
            formattedNumber = (numAmount / 1000000).toFixed(1) + 'M';
        } else if (numAmount >= 1000) {
            formattedNumber = (numAmount / 1000).toFixed(1) + 'K';
        } else {
            formattedNumber = numAmount.toFixed(decimals);
        }
    } else {
        formattedNumber = numAmount.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }

    // Build the final string
    let result: string;
    if (position === 'after') {
        result = `${formattedNumber}${symbol}`;
    } else {
        result = `${symbol}${formattedNumber}`;
    }

    if (options?.showCode) {
        result = `${result} ${currencyCode}`;
    }

    return result;
}

/**
 * Format a salary range
 */
export function formatSalaryRange(
    min: number | string | null | undefined,
    max: number | string | null | undefined,
    currencyCode: string = 'MYR',
    period?: string
): string {
    const minNum = typeof min === 'string' ? parseFloat(min) : min;
    const maxNum = typeof max === 'string' ? parseFloat(max) : max;

    if (!minNum && !maxNum) return 'Negotiable';

    const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.MYR;
    const { symbol } = config;

    let result: string;
    if (minNum && maxNum) {
        if (minNum === maxNum) {
            result = formatCurrency(minNum, currencyCode);
        } else {
            result = `${symbol}${minNum.toLocaleString()} - ${symbol}${maxNum.toLocaleString()}`;
        }
    } else if (minNum) {
        result = `From ${formatCurrency(minNum, currencyCode)}`;
    } else if (maxNum) {
        result = `Up to ${formatCurrency(maxNum, currencyCode)}`;
    } else {
        result = 'Negotiable';
    }

    if (period) {
        const periodLabels: Record<string, string> = {
            hourly: '/hr',
            daily: '/day',
            weekly: '/week',
            monthly: '/mo',
            yearly: '/yr',
            per_hour: '/hr',
            per_day: '/day',
            per_week: '/week',
            per_month: '/mo',
            per_year: '/yr',
        };
        result += ` ${periodLabels[period] || `/${period}`}`;
    }

    return result;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: string = 'MYR'): string {
    return CURRENCY_CONFIG[currencyCode]?.symbol || currencyCode;
}
