'use client';

import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { fetchKPIs } from '@/lib/api/dashboard';

export default function KPIsPage() {
    const query = useQuery({
        queryKey: ['kpis'],
        queryFn: fetchKPIs,
    });

    const kpis = query.data ?? [];

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Team KPIs</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Live KPI rollups from completed tasks and onboarding events.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/kpis/onboarding-events"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            View onboarding events
                        </Link>
                        <Link
                            href="/kpis/task-completions"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            View task completions
                        </Link>
                        <Link
                            href="/kpis/onboarding-team"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            View onboarding team
                        </Link>
                    </div>
                </div>

                {query.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading KPIs...</div>
                ) : query.error ? (
                    <Card><CardContent className="py-12 text-center text-red-500">Unable to load KPI summaries.</CardContent></Card>
                ) : kpis.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-gray-500">No KPI data available yet.</CardContent></Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {kpis.map((kpi) => (
                            <Card key={kpi.teamMember} padding="md">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{kpi.teamMember}</h2>
                                <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <p>Tasks completed: <span className="font-semibold text-gray-900 dark:text-gray-100">{kpi.tasksCompleted}</span></p>
                                    <p>Members onboarded: <span className="font-semibold text-gray-900 dark:text-gray-100">{kpi.membersOnboarded}</span></p>
                                    <p>Avg response time: <span className="font-semibold text-gray-900 dark:text-gray-100">{kpi.avgResponseTime} hrs</span></p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
