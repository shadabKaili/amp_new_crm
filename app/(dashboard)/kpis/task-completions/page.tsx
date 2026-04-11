'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { fetchTaskCompletionEvents } from '@/lib/api/task-completions';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, Clock3, UserCheck } from 'lucide-react';

export default function TaskCompletionEventsPage() {
    const query = useQuery({
        queryKey: ['task-completion-events'],
        queryFn: () => fetchTaskCompletionEvents(100, 0),
    });

    const events = useMemo(() => query.data?.data ?? [], [query.data?.data]);
    const grouped = useMemo(() => {
        const byTeamMember = new Map<string, typeof events>();

        for (const event of events) {
            const key = event.completed_by_name || 'Unassigned';
            const existing = byTeamMember.get(key) ?? [];
            byTeamMember.set(key, [...existing, event]);
        }

        return Array.from(byTeamMember.entries()).map(([teamMember, taskEvents]) => ({
            teamMember,
            count: taskEvents.length,
            taskEvents,
        }));
    }, [events]);

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Task Completion Events</h1>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                            Audit trail for tasks marked completed, grouped by the internal user who completed them.
                        </p>
                    </div>
                    <Card padding="sm">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-green-50 p-2 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500">Completed events</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{events.length}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {query.isLoading ? (
                    <div className="py-12 text-center text-gray-500">Loading task completion events...</div>
                ) : query.error ? (
                    <Card>
                        <CardContent className="py-12 text-center text-red-500">Unable to load task completion events.</CardContent>
                    </Card>
                ) : events.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">No task completion events recorded yet.</CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {grouped.map((group) => (
                            <Card key={group.teamMember}>
                                <CardHeader className="flex flex-row items-center justify-between gap-4">
                                    <CardTitle>{group.teamMember}</CardTitle>
                                    <Badge variant="default">{group.count}</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {group.taskEvents.map((event) => (
                                            <div key={event.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="success">completed</Badge>
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{event.task_title}</span>
                                                            <Badge variant="default">{event.task_priority || 'medium'}</Badge>
                                                        </div>
                                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                            Status at completion: {event.task_status || 'completed'}
                                                        </p>
                                                        {event.notes ? (
                                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{event.notes}</p>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-left md:text-right space-y-2">
                                                        <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                            <Clock3 className="h-4 w-4" />
                                                            {formatDate(event.created_at ?? new Date())}
                                                        </div>
                                                        <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                            <UserCheck className="h-4 w-4" />
                                                            {event.completed_by_name || 'Unassigned'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
