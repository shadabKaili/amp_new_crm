import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    if (!isOpen) return null;

    const sizeStyles = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        full: 'max-w-full m-2 md:m-4',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
                className={cn(
                    'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col',
                    sizeStyles[size]
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
