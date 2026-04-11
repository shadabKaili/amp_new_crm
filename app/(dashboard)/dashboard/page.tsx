'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { fetchDashboardActivityFeed, fetchDashboardStats, fetchMemberDashboard, fetchPendingDashboardTasks } from '@/lib/api/dashboard';
import { isInternalUser } from '@/lib/auth/supabase';
import { Users, UserCheck, ListTodo, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

function AdminDashboard() {
    const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats });
    const activityQuery = useQuery({ queryKey: ['dashboard-activity'], queryFn: () => fetchDashboardActivityFeed(6) });
    const tasksQuery = useQuery({ queryKey: ['dashboard-pending-tasks'], queryFn: () => fetchPendingDashboardTasks(5) });

    if (statsQuery.isLoading) {
        return <div className="text-gray-500">Loading dashboard...</div>;
    }

    if (statsQuery.error || !statsQuery.data) {
        return <div className="text-red-500">Unable to load dashboard metrics.</div>;
    }

    const stats = statsQuery.data;
    const statCards = [
        { label: 'Total Members', value: stats.totalMembers, icon: Users, color: 'text-blue-600' },
        { label: 'Active Volunteers', value: stats.activeVolunteers, icon: UserCheck, color: 'text-green-600' },
        { label: 'Pending Tasks', value: stats.pendingTasks, icon: ListTodo, color: 'text-orange-600' },
        { label: 'Donations This Month', value: formatCurrency(stats.donationsThisMonth), icon: DollarSign, color: 'text-emerald-600' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label} padding="md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-gray-100">
                                        {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                                    </p>
                                </div>
                                <Icon className={`w-8 h-8 ${stat.color}`} />
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Member Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <span className="text-lg font-semibold text-green-600">+{stats.memberGrowth}%</span>
                            <span className="text-gray-600 dark:text-gray-400">this month</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pending Tasks Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tasksQuery.data?.length ? (
                            <div className="space-y-3">
                                {tasksQuery.data.map((task) => (
                                    <div key={task.id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                                        <p className="text-sm text-gray-500 mt-1">{task.relatedProjectName || task.relatedMemberName || 'General task'}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No pending tasks right now.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {activityQuery.data?.length ? (
                        <div className="space-y-3">
                            {activityQuery.data.map((activity) => (
                                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{activity.title}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{activity.memberName} on {formatDate(activity.date)}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-green-600">+{activity.scoreEarned}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No recent activity in the selected period.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function MemberDashboardView({ user }: { user: { id: string; name: string; memberId?: string } }) {
    const dashboardQuery = useQuery({
        queryKey: ['member-dashboard', user.id],
        queryFn: () => fetchMemberDashboard(user.memberId ?? user.id),
    });

    if (dashboardQuery.isLoading) {
        return <div className="text-gray-500">Loading dashboard...</div>;
    }

    if (dashboardQuery.error || !dashboardQuery.data) {
        return <div className="text-red-500">Unable to load member dashboard.</div>;
    }

    const dashboard = dashboardQuery.data;

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <div>
                    <p className="text-sm opacity-90">Your AMP ID</p>
                    <p className="text-3xl font-bold mt-2">{dashboard.ampId}</p>
                    <p className="text-sm opacity-90 mt-4">Welcome back, {user.name}!</p>
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md">
                    <p className="text-sm text-gray-600 dark:text-gray-400">My Score</p>
                    <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-500">{formatNumber(dashboard.score)}</p>
                </Card>
                <Card padding="md">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Referrals</p>
                    <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">{dashboard.referralsCount}</p>
                </Card>
                <Card padding="md">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Donations</p>
                    <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">{formatCurrency(dashboard.donationsTotal)}</p>
                </Card>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user, loading } = useAuth();

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {user && isInternalUser(user) ? 'Dashboard Overview' : 'My Dashboard'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {user && isInternalUser(user) ? 'Monitor key metrics and team performance' : 'Track your activities and contributions'}
                    </p>
                </div>

                {!loading && user && (isInternalUser(user) ? <AdminDashboard /> : <MemberDashboardView user={user} />)}
            </div>
        </AppLayout>
    );
}
