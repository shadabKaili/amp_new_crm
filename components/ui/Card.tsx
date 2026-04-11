import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    padding?: 'sm' | 'md' | 'lg';
}

export function Card({ className, children, padding = 'md', ...props }: CardProps) {
    const paddingStyles = {
        sm: 'p-3',
        md: 'p-4 md:p-6',
        lg: 'p-6 md:p-8',
    };

    return (
        <div
            className={cn(
                'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
                paddingStyles[padding],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div className={cn('mb-4', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <h3 className={cn('text-lg font-semibold text-gray-900 dark:text-gray-100', className)}>
            {children}
        </h3>
    );
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div className={cn('', className)}>
            {children}
        </div>
    );
}
