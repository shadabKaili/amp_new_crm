import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(d);
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'AED',
    }).format(amount);
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
}

export function getDateRangePreset(preset: '7d' | '30d' | '90d' = '30d') {
    const to = new Date();
    const from = new Date(to);
    const dayCount = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
    from.setDate(from.getDate() - dayCount);

    return {
        from: from.toISOString(),
        to: to.toISOString(),
    };
}
