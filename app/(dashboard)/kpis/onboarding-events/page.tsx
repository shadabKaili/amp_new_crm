'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { fetchMemberOnboardingEvents } from '@/lib/api/onboarding';
import { formatDate } from '@/lib/utils';
import { Users, UserCheck, Calendar } from 'lucide-react';

export default function OnboardingEventsPage() {
    const query = useQuery({
        queryKey: ['member-onboarding-events'],
        queryFn: () => fetchMemberOnboardingEvents(100, 0),
    });

    const events = useMemo(() => query.data?.data ?? [], [query.data?.data]);
    const grouped = useMemo(() => {
        const byTeamMember = new Map<string, typeof events>();

        for (const event of events) {
            const key = event.team_member_name || 'Unassigned';
            const existing = byTeamMember.get(key) ?? [];
            byTeamMember.set(key, [...existing, event]);
        }

        return Array.from(byTeamMember.entries()).map(([teamMember, memberEvents]) => ({
            teamMember,
            count: memberEvents.length,
            memberEvents,
        }));
    }, [events]);

    const totalEvents = events.length;
    const teamMembers = grouped.length;

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Onboarding Events</h1>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                            Audit trail for member onboarding, grouped by the internal team member who handled the activation.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Card padding="sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-green-50 p-2 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Events</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{totalEvents}</p>
                                </div>
                            </div>
                        </Card>

                        <Card padding="sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Team members</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{teamMembers}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {query.isLoading ? (
                    <div className="py-12 text-center text-gray-500">Loading onboarding events...</div>
                ) : query.error ? (
                    <Card>
                        <CardContent className="py-12 text-center text-red-500">Unable to load onboarding events.</CardContent>
                    </Card>
                ) : events.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">No onboarding events recorded yet.</CardContent>
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
                                        {group.memberEvents.map((event) => (
                                            <div
                                                key={event.id}
                                                className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
                                            >
                                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="success">member onboarded</Badge>
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {event.member_name}
                                                            </span>
                                                            {event.member_amp_id ? (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {event.member_amp_id}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                            {event.member_email || 'No email provided'}
                                                        </p>
                                                        {event.notes ? (
                                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{event.notes}</p>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-left md:text-right">
                                                        <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                            <UserCheck className="h-4 w-4" />
                                                            {formatDate(event.created_at ?? new Date())}
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
