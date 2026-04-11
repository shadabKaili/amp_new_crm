import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, rightElement, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        const inputEl = (
            <input
                ref={ref}
                id={inputId}
                className={cn(
                    'w-full px-4 py-3 text-base rounded-lg border transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
                    'min-h-[48px]', // Mobile-friendly height
                    error
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-700'
                        : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600',
                    'dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    rightElement && 'pr-12',
                    className
                )}
                {...props}
            />
        );

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                {rightElement ? (
                    <div className="relative">
                        {inputEl}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <span className="pointer-events-auto">{rightElement}</span>
                        </div>
                    </div>
                ) : (
                    inputEl
                )}
                {error && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
