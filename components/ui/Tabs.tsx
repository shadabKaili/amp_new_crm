import { ReactNode } from 'react';

interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
}

interface TabsListProps {
    children: ReactNode;
}

interface TabsTriggerProps {
    value: string;
    children: ReactNode;
}

interface TabsContentProps {
    value: string;
    children: ReactNode;
}

export function Tabs({ value, onValueChange, children }: TabsProps) {
    return (
        <div data-tabs-value={value} onClick={(e) => {
            const target = e.target as HTMLElement;
            const trigger = target.closest('[data-tab-value]');
            if (trigger) {
                onValueChange(trigger.getAttribute('data-tab-value') || '');
            }
        }}>
            {children}
        </div>
    );
}

export function TabsList({ children }: TabsListProps) {
    return (
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {children}
        </div>
    );
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
    return (
        <button
            data-tab-value={value}
            className="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent hover:text-green-600 hover:border-green-600 focus:outline-none focus:text-green-600 focus:border-green-600 data-[active=true]:text-green-600 data-[active=true]:border-green-600 text-gray-600 dark:text-gray-400 dark:hover:text-green-500 dark:data-[active=true]:text-green-500 min-h-[48px]"
            type="button"
        >
            {children}
        </button>
    );
}

export function TabsContent({ value, children }: TabsContentProps) {
    return (
        <div data-tab-content={value} className="py-4">
            {children}
        </div>
    );
}

// Helper component that handles active state
export function TabsContainer({
    activeTab,
    onTabChange,
    tabs
}: {
    activeTab: string;
    onTabChange: (tab: string) => void;
    tabs: Array<{ value: string; label: string; content: ReactNode }>;
}) {
    return (
        <div>
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => onTabChange(tab.value)}
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-[48px] ${activeTab === tab.value
                                ? 'border-green-600 text-green-600 dark:text-green-500'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-green-600 hover:border-green-300'
                            }`}
                        type="button"
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="py-4">
                {tabs.find(t => t.value === activeTab)?.content}
            </div>
        </div>
    );
}
