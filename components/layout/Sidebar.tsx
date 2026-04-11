'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ListTodo,
    Users,
    FolderKanban,
    Activity,
    Heart,
    UserPlus,
    DollarSign,
    BarChart3,
    ShieldCheck,
    ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
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
    { label: 'Onboarding Audit', href: '/kpis/onboarding-events', icon: ShieldCheck, roles: ['super_admin', 'manager'] },
    { label: 'Task Audit', href: '/kpis/task-completions', icon: ClipboardCheck, roles: ['super_admin', 'manager'] },
];

const memberNavItems: NavItem[] = [
    { label: 'Portal', href: '/portal', icon: LayoutDashboard, roles: ['member', 'super_admin', 'manager', 'team_member'] },
    { label: 'Projects', href: '/portal/projects', icon: FolderKanban, roles: ['member', 'super_admin', 'manager', 'team_member'] },
    { label: 'My Activities', href: '/portal/activities', icon: Activity, roles: ['member', 'super_admin', 'manager', 'team_member'] },
    { label: 'My Referrals', href: '/portal/referrals', icon: Heart, roles: ['member', 'super_admin', 'manager', 'team_member'] },
    { label: 'My Donations', href: '/portal/donations', icon: DollarSign, roles: ['member', 'super_admin', 'manager', 'team_member'] },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Filter items based on user role
    const navItems = isInternalRole(user?.role) ? internalNavItems : memberNavItems;
    const allowedItems = navItems.filter(item => {
        if (!item.roles) return true;
        return user && item.roles.includes(user.role);
    });

    return (
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-xl font-bold text-green-600 dark:text-green-500">
                    AMP CRM
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Association of Muslim Professionals
                </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-1">
                    {allowedItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Icon className="w-5 h-5 mr-3" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
