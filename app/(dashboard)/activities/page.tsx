'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fetchActivitiesPage } from '@/lib/api/activities';
import { formatDate, getDateRangePreset } from '@/lib/utils';
import { Calendar, Award } from 'lucide-react';
import { Select } from '@/components/ui/Select';

export default function ActivitiesPage() {
    const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
    const range = useMemo(() => getDateRangePreset(period), [period]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['activities', period],
        queryFn: () => fetchActivitiesPage({ ...range, limit: 30, offset: 0 }),
    });

    const activities = data?.data ?? [];

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Activities & Scoring</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Partition-safe activity feed with required date filters.</p>
                    </div>
                    <div className="w-full md:w-48">
                        <Select
                            options={[
                                { value: '7d', label: 'Last 7 days' },
                                { value: '30d', label: 'Last 30 days' },
                                { value: '90d', label: 'Last 90 days' },
                            ]}
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading activities...</div>
                ) : error ? (
                    <Card><div className="text-center py-12 text-red-500">Unable to load activities right now.</div></Card>
                ) : activities.length === 0 ? (
                    <Card><div className="text-center py-12 text-gray-500">No activities found for this range.</div></Card>
                ) : (
                    <div className="space-y-4">
                        {activities.map((activity, index) => (
                            <Card key={activity.id} padding="md" className="relative pl-8">
                                {index < activities.length - 1 && <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />}
                                <div className="absolute left-3 top-6 w-4 h-4 rounded-full bg-green-600 border-4 border-white dark:border-gray-800" />

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{activity.title}</h3>
                                            <Badge variant="default">{activity.type.replace('_', ' ')}</Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.memberName}</p>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(activity.date)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                                        <Award className="w-5 h-5 text-green-600 dark:text-green-500" />
                                        <span className="font-semibold text-green-600 dark:text-green-500">+{activity.scoreEarned}</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
