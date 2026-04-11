'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/context';
import { fetchMemberDashboard } from '@/lib/api/dashboard';
import { fetchProjectsPage } from '@/lib/api/projects';
import { fetchProjectEvents, fetchProjectMemberState } from '@/lib/api/project-engagement';
import { fetchActivitiesPage } from '@/lib/api/activities';
import { fetchDonationsPage } from '@/lib/api/donations';
import { fetchReferralsPage } from '@/lib/api/referrals';
import { formatCurrency, formatDate, formatNumber, getDateRangePreset } from '@/lib/utils';
import { ArrowRight, FolderKanban, Heart, IndianRupee, LineChart, Sparkles } from 'lucide-react';

export default function MemberPortalPage() {
    const { user, loading } = useAuth();
    const memberId = user?.memberId;
    const recentRange = useMemo(() => getDateRangePreset('30d'), []);

    const dashboardQuery = useQuery({
        queryKey: ['member-portal', memberId],
        enabled: Boolean(memberId),
        queryFn: () => fetchMemberDashboard(memberId!),
    });

    const activityQuery = useQuery({
        queryKey: ['member-portal-activities', memberId],
        enabled: Boolean(memberId),
        queryFn: () =>
            fetchActivitiesPage({
                memberId: memberId!,
                from: recentRange.from,
                to: recentRange.to,
                limit: 5,
                offset: 0,
            }),
    });

    const donationsQuery = useQuery({
        queryKey: ['member-portal-donations', memberId],
        enabled: Boolean(memberId),
        queryFn: () =>
            fetchDonationsPage({
                memberId: memberId!,
                from: recentRange.from,
                to: recentRange.to,
                limit: 5,
                offset: 0,
            }),
    });

    const referralsQuery = useQuery({
        queryKey: ['member-portal-referrals', memberId],
        enabled: Boolean(memberId),
        queryFn: () =>
            fetchReferralsPage({
                referrerId: memberId!,
                limit: 5,
                offset: 0,
            }),
    });
    const myProjectsQuery = useQuery({
        queryKey: ['member-portal-my-projects', memberId],
        enabled: Boolean(memberId),
        queryFn: async () => {
            const projects = await fetchProjectsPage({ status: 'active', limit: 4, offset: 0 });
            if (!memberId) {
                return [];
            }

            const enriched = await Promise.all(
                projects.data.map(async (project) => ({
                    ...project,
                    state: await fetchProjectMemberState(project.id, memberId),
                })),
            );

            return enriched;
        },
    });

    const recentActivities = activityQuery.data?.data ?? [];
    const recentDonations = donationsQuery.data?.data ?? [];
    const recentReferrals = referralsQuery.data?.data ?? [];
    const myProjects = myProjectsQuery.data ?? [];
    const participatingProjects = myProjects.filter((project) => project.state?.isParticipant || project.state?.requestStatus === 'approved');
    const pendingProjects = myProjects.filter((project) => project.state?.requestStatus === 'pending');
    const openProjects = myProjects.filter((project) => !project.state?.isParticipant && !project.state?.requestStatus);
    const nextProject = myProjects[0];
    const nextProjectEventsQuery = useQuery({
        queryKey: ['member-portal-next-project-events', memberId, nextProject?.id],
        enabled: Boolean(memberId && nextProject?.id),
        queryFn: () => fetchProjectEvents(nextProject?.id ?? '', 'upcoming'),
    });
    const nextProjectEvent = nextProjectEventsQuery.data?.[0];
    const nextProjectState = nextProject?.state;
    const nextActionVariant = nextProjectState?.isParticipant || nextProjectState?.requestStatus === 'approved'
        ? 'success'
        : nextProjectState?.requestStatus === 'pending'
            ? 'warning'
            : 'default';
    const nextActionLabel = nextProjectState?.isParticipant || nextProjectState?.requestStatus === 'approved'
        ? nextProjectEvent
            ? 'Submit attendance'
            : 'Open project'
        : nextProjectState?.requestStatus === 'pending'
            ? 'View pending request'
            : 'Request to contribute';
    const nextActionHint = nextProjectState?.isParticipant || nextProjectState?.requestStatus === 'approved'
        ? nextProjectEvent
            ? 'Your next step is to submit attendance for the upcoming event.'
            : 'You are already participating in this project.'
        : nextProjectState?.requestStatus === 'pending'
            ? 'Your participation request is waiting for review.'
            : 'You can ask to join this project and contribute to its upcoming work.';

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="rounded-3xl bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 text-white p-6 md:p-8 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Member Portal
                            </div>
                            <h1 className="mt-4 text-3xl md:text-4xl font-bold">Welcome back, {user?.name}</h1>
                            <p className="mt-2 max-w-2xl text-sm md:text-base text-white/85">
                                View your AMP score, track your donations, and keep an eye on activity and referrals in one place.
                            </p>
                        </div>
                        {user?.ampId ? (
                            <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Your AMP ID</p>
                                <p className="mt-2 text-2xl font-bold">{user.ampId}</p>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Profile</p>
                                <p className="mt-2 text-sm text-white/85">Ask an admin to link your member profile.</p>
                            </div>
                        )}
                    </div>
                </div>

                {!loading && !memberId ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your member profile is not linked yet.</p>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">Please ask an AMP administrator to connect this auth account to your member record.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Card padding="md">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">My Score</p>
                                        <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-500">{formatNumber(dashboardQuery.data?.score ?? 0)}</p>
                                    </div>
                                    <LineChart className="h-8 w-8 text-green-600" />
                                </div>
                            </Card>
                            <Card padding="md">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Referrals</p>
                                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboardQuery.data?.referralsCount ?? 0}</p>
                                    </div>
                                    <Heart className="h-8 w-8 text-rose-500" />
                                </div>
                            </Card>
                            <Card padding="md">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Donations</p>
                                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(dashboardQuery.data?.donationsTotal ?? 0)}</p>
                                    </div>
                                    <IndianRupee className="h-8 w-8 text-emerald-600" />
                                </div>
                            </Card>
                            <Card padding="md">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Activities</p>
                                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{recentActivities.length}</p>
                                    </div>
                                    <Sparkles className="h-8 w-8 text-amber-500" />
                                </div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card padding="md">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Participating Projects</p>
                                <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{participatingProjects.length}</p>
                            </Card>
                            <Card padding="md">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Requests</p>
                                <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingProjects.length}</p>
                            </Card>
                            <Card padding="md">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Open Projects</p>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{openProjects.length}</p>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>Next Action</CardTitle>
                                <Badge variant={nextActionVariant}>
                                    {nextActionLabel}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                {nextProject ? (
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{nextProject.name}</p>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                {nextProjectEvent
                                                    ? `${nextProjectEvent.title} on ${formatDate(nextProjectEvent.eventDate)}`
                                                    : 'No upcoming event scheduled yet.'}
                                            </p>
                                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                {nextActionHint}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/portal/projects/${nextProject.id}`}
                                            className={`inline-flex items-center justify-center rounded-lg px-4 py-3 text-white min-h-[48px] font-medium transition-colors ${nextActionVariant === 'success'
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : nextActionVariant === 'warning'
                                                    ? 'bg-amber-600 hover:bg-amber-700'
                                                    : 'bg-green-600 hover:bg-green-700'
                                                }`}
                                        >
                                            {nextActionLabel}
                                        </Link>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No active projects available right now.</p>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2">
                                <CardHeader className="flex-row items-center justify-between">
                                    <CardTitle>Recent Activity</CardTitle>
                                    <Link href="/portal/activities" className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1">
                                        View all <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </CardHeader>
                                <CardContent>
                                    {recentActivities.length ? (
                                        <div className="space-y-3">
                                            {recentActivities.map((activity) => (
                                                <div key={activity.id} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{activity.title}</p>
                                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{formatDate(activity.date)}</p>
                                                    </div>
                                                    <Badge variant="default">+{activity.scoreEarned}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No recent activity yet.</p>
                                    )}
                                </CardContent>
                            </Card>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="flex-row items-center justify-between">
                                    <CardTitle>Top Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                        <Link href="/portal/projects" className="flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-white min-h-[48px] font-medium hover:bg-emerald-700 transition-colors">
                                            Explore projects
                                        </Link>
                                        <Link href="/portal/referrals" className="flex items-center justify-center rounded-lg bg-green-600 px-4 py-3 text-white min-h-[48px] font-medium hover:bg-green-700 transition-colors">
                                            View referrals
                                        </Link>
                                        <Link href="/portal/donations" className="flex items-center justify-center rounded-lg bg-gray-200 px-4 py-3 text-gray-900 min-h-[48px] font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors">
                                            View donations
                                        </Link>
                                        <Link href="/portal/activities" className="flex items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-gray-700 min-h-[48px] font-medium hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                                            View activity log
                                        </Link>
                                    </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex-row items-center justify-between">
                                    <CardTitle>My Projects</CardTitle>
                                    <Link href="/portal/projects" className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1">
                                        View all <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {myProjectsQuery.data?.length ? myProjectsQuery.data.map((project) => {
                                        const state = project.state;
                                        const actionLabel = state?.isParticipant || state?.requestStatus === 'approved'
                                            ? 'Submit activity'
                                            : state?.requestStatus === 'pending'
                                                ? 'Request pending'
                                                : 'Request to contribute';

                                        return (
                                            <Link
                                                key={project.id}
                                                href={`/portal/projects/${project.id}`}
                                                className="block rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50 hover:shadow-sm transition-shadow"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{project.name}</p>
                                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                            {project.description || 'Active community initiative'}
                                                        </p>
                                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                                            <Badge variant={state?.isParticipant || state?.requestStatus === 'approved' ? 'success' : state?.requestStatus === 'pending' ? 'warning' : 'default'}>
                                                                {state?.isParticipant ? 'Participating' : state?.requestStatus || 'Open'}
                                                            </Badge>
                                                            <Badge variant="default">{project.type.replace('_', ' ')}</Badge>
                                                        </div>
                                                    </div>
                                                    <FolderKanban className="h-5 w-5 shrink-0 text-green-600" />
                                                </div>
                                                <div className="mt-4 flex items-center justify-between gap-3">
                                                    <p className="text-sm font-medium text-green-600">{actionLabel}</p>
                                                    <ArrowRight className="h-4 w-4 text-green-600" />
                                                </div>
                                            </Link>
                                        );
                                    }) : (
                                        <p className="text-sm text-gray-500">No active projects available right now.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Referrals</CardTitle>
                                </CardHeader>
                                    <CardContent className="space-y-3">
                                        {recentReferrals.length ? recentReferrals.map((referral) => (
                                            <div key={referral.id} className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{referral.referredName}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(referral.createdAt)}</p>
                                                </div>
                                                <Badge variant="default">{referral.status}</Badge>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-gray-500">No referrals yet.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <Card>
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>Recent Donations</CardTitle>
                                <Link href="/portal/donations" className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1">
                                    View all <ArrowRight className="h-4 w-4" />
                                </Link>
                            </CardHeader>
                            <CardContent>
                                {recentDonations.length ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {recentDonations.map((donation) => (
                                            <div key={donation.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(donation.amount)}</p>
                                                    <Badge variant="default">{donation.paymentMethod}</Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{donation.purpose || 'General donation'}</p>
                                                <p className="mt-1 text-xs text-gray-500">{formatDate(donation.date)}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No donations yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
