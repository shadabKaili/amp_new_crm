'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ListTodo,
    Users,
    MoreHorizontal,
    FolderKanban,
    Activity,
    Heart,
    UserPlus,
    DollarSign,
    BarChart3,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useState } from 'react';
import { isInternalRole } from '@/lib/auth/access';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    roles?: Array<'super_admin' | 'manager' | 'team_member' | 'member'>;
}

const internalNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'manager', 'team_member'] },
    { label: 'Tasks', href: '/tasks', icon: ListTodo, roles: ['super_admin', 'manager', 'team_member'] },
    { label: 'Members', href: '/members', icon: Users, roles: ['super_admin', 'manager', 'team_member'] },
    { label: 'Projects', href: '/projects', icon: FolderKanban, roles: ['super_admin', 'manager', 'team_member'] },
    { label: 'Activities', href: '/activities', icon: Activity, roles: ['super_admin', 'manager', 'team_member'] },
    { label: 'Referrals', href: '/referrals', icon: Heart, roles: ['super_admin', 'manager', 'team_member'] },
    { label: 'Donations', href: '/donations', icon: DollarSign, roles: ['super_admin', 'manager', 'team_member'] },
    { label: 'Volunteers', href: '/volunteer-applications', icon: UserPlus, roles: ['super_admin', 'manager', 'team_member'] },
    { label: 'KPIs', href: '/kpis', icon: BarChart3, roles: ['super_admin', 'manager'] },
];

const memberNavItems: NavItem[] = [
    { label: 'Portal', href: '/portal', icon: LayoutDashboard, roles: ['member', 'super_admin', 'manager', 'team_member'] },
    { label: 'Projects', href: '/portal/projects', icon: FolderKanban, roles: ['member', 'super_admin', 'manager', 'team_member'] },
    { label: 'Activities', href: '/portal/activities', icon: Activity, roles: ['member', 'super_admin', 'manager', 'team_member'] },
    { label: 'Referrals', href: '/portal/referrals', icon: Heart, roles: ['member', 'super_admin', 'manager', 'team_member'] },
    { label: 'Donations', href: '/portal/donations', icon: DollarSign, roles: ['member', 'super_admin', 'manager', 'team_member'] },
];

export function BottomNav() {
    const pathname = usePathname();
    const { user } = useAuth();
    const [showMore, setShowMore] = useState(false);

    // Filter items based on user role
    const navItems = isInternalRole(user?.role) ? internalNavItems : memberNavItems;
    const allowedItems = navItems.filter(item => {
        if (!item.roles) return true;
        return user && item.roles.includes(user.role);
    });

    // Primary items (first 3 + More)
    const primaryItems = allowedItems.slice(0, 3);
    const moreItems = allowedItems.slice(3);

    return (
        <>
            {/* More menu overlay */}
            {showMore && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={() => setShowMore(false)}
                >
                    <div
                        className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-2 grid grid-cols-3 gap-2">
                            {moreItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowMore(false)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-h-[60px] ${isActive
                                                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5 mb-1" />
                                        <span className="text-xs font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom navigation bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 lg:hidden">
                <div className="flex items-center justify-around">
                    {primaryItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors min-h-[64px] ${isActive
                                        ? 'text-green-600 dark:text-green-500'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                <Icon className="w-6 h-6 mb-1" />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        );
                    })}

                    {/* More button */}
                    {moreItems.length > 0 && (
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors min-h-[64px] ${showMore
                                    ? 'text-green-600 dark:text-green-500'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <MoreHorizontal className="w-6 h-6 mb-1" />
                            <span className="text-xs font-medium">More</span>
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
}
