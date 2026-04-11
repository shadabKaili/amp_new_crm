import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
    const variantStyles = {
        success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                variantStyles[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}

// Helper function to get badge variant from status
export function getStatusBadgeVariant(status: string): BadgeProps['variant'] {
    const statusMap: Record<string, BadgeProps['variant']> = {
        active: 'success',
        completed: 'success',
        approved: 'success',
        pending: 'warning',
        applied: 'warning',
        submitted: 'info',
        in_progress: 'info',
        reviewing: 'info',
        inactive: 'default',
        delayed: 'danger',
        rejected: 'danger',
        on_hold: 'warning',
        upcoming: 'info',
        cancelled: 'danger',
        participant: 'success',
    };

    return statusMap[status] || 'default';
}
