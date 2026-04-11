'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { useAuth } from '@/lib/auth/context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { canAccessPath } from '@/lib/auth/access';

function getDefaultRouteForUser(role?: string) {
    return role === 'member' ? '/portal' : '/dashboard';
}

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }

        if (!loading && user && !canAccessPath(user, pathname)) {
            router.push(getDefaultRouteForUser(user.role));
        }
    }, [user, loading, pathname, router]);

    if (loading || !user || !canAccessPath(user, pathname)) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
                <div className="text-sm text-gray-500">Loading workspace...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main content area */}
            <div className="lg:pl-64">
                <TopBar />

                {/* Page content - with padding for bottom nav on mobile */}
                <main className="p-4 md:p-6 pb-20 lg:pb-6">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
