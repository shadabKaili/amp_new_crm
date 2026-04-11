'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/context';
import { fetchActivitiesPage } from '@/lib/api/activities';
import { formatDate, formatNumber, getDateRangePreset } from '@/lib/utils';

export default function MemberActivitiesPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState<'30d' | '90d'>('30d');
    const memberId = user?.memberId;
    const range = useMemo(() => getDateRangePreset(period), [period]);

    const query = useQuery({
        queryKey: ['member-portal-activities-page', memberId, period],
        enabled: Boolean(memberId),
        queryFn: () =>
            fetchActivitiesPage({
                memberId: memberId!,
                from: range.from,
                to: range.to,
                limit: 50,
                offset: 0,
            }),
    });

    const activities = query.data?.data ?? [];
    const totalScore = activities.reduce((sum, activity) => sum + activity.scoreEarned, 0);

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">My Activities</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Track the actions that contribute to your AMP score.</p>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time range</label>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as '30d' | '90d')}
                            className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900 min-h-[48px] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                        >
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card padding="md">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Activity Count</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(activities.length)}</p>
                    </Card>
                    <Card padding="md">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Score Earned</p>
                        <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-500">+{formatNumber(totalScore)}</p>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {query.isLoading ? (
                            <p className="text-gray-500">Loading activities...</p>
                        ) : activities.length ? (
                            <div className="space-y-3">
                                {activities.map((activity) => (
                                    <div key={activity.id} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{activity.title}</p>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{activity.memberName}</p>
                                            <p className="mt-1 text-xs text-gray-500">{formatDate(activity.date)}</p>
                                        </div>
                                        <Badge variant="default">+{activity.scoreEarned}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No activities found for this period.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
