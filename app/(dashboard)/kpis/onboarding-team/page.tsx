'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { fetchOnboardingTeamMembers, updateOnboardingTeamMember } from '@/lib/api/onboarding-team';
import { formatDate } from '@/lib/utils';
import { Users, UserPlus, UserMinus, CalendarClock } from 'lucide-react';

export default function OnboardingTeamPage() {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['onboarding-team-members'],
        queryFn: () => fetchOnboardingTeamMembers(100, 0),
    });

    const mutation = useMutation({
        mutationFn: ({ userId, isOnboardingTeam }: { userId: string; isOnboardingTeam: boolean }) =>
            updateOnboardingTeamMember(userId, isOnboardingTeam),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-team-members'] }),
    });

    const members = query.data?.data ?? [];
    const onboardingTeam = members.filter((member) => member.isOnboardingTeam);

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Onboarding Team</h1>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                            Manage which internal team members receive new volunteer assignments.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Card padding="sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-green-50 p-2 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Team members</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{onboardingTeam.length}</p>
                                </div>
                            </div>
                        </Card>

                        <Card padding="sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                    <CalendarClock className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Available users</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{members.length}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {query.isLoading ? (
                    <div className="py-12 text-center text-gray-500">Loading onboarding team...</div>
                ) : query.error ? (
                    <Card>
                        <CardContent className="py-12 text-center text-red-500">Unable to load onboarding team.</CardContent>
                    </Card>
                ) : members.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">No internal users available yet.</CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {members.map((member) => (
                            <Card key={member.userId} padding="md">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{member.teamMemberName}</h2>
                                            <Badge variant={member.isOnboardingTeam ? 'success' : 'default'}>
                                                {member.isOnboardingTeam ? 'Onboarding team' : 'Not assigned'}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{member.email || 'No email available'}</p>
                                        <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                            <p>
                                                Volunteer assignments: <span className="font-semibold text-gray-900 dark:text-gray-100">{member.assignedVolunteerApps}</span>
                                            </p>
                                            <p>
                                                Last assigned:{' '}
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {member.lastAssignedAt ? formatDate(member.lastAssignedAt) : 'Never'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant={member.isOnboardingTeam ? 'outline' : 'primary'}
                                        className="sm:shrink-0"
                                        onClick={() => mutation.mutate({ userId: member.userId, isOnboardingTeam: !member.isOnboardingTeam })}
                                        disabled={mutation.isPending}
                                    >
                                        {member.isOnboardingTeam ? (
                                            <>
                                                <UserMinus className="mr-2 h-4 w-4" />
                                                Remove from team
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add to team
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
