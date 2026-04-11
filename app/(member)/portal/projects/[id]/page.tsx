'use client';

import { FormEvent, use, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/context';
import { fetchProjectById } from '@/lib/api/projects';
import {
    fetchProjectActivitySubmissions,
    fetchProjectEvents,
    fetchProjectMemberState,
    requestProjectParticipation,
    submitProjectActivity,
} from '@/lib/api/project-engagement';
import { formatDate } from '@/lib/utils';
import { Calendar, CircleDashed, HandHeart, ShieldAlert } from 'lucide-react';

export default function MemberProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const memberId = user?.memberId;
    const [requestNote, setRequestNote] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [requestError, setRequestError] = useState('');

    const projectQuery = useQuery({
        queryKey: ['member-project-detail', resolvedParams.id],
        queryFn: () => fetchProjectById(resolvedParams.id),
    });

    const eventsQuery = useQuery({
        queryKey: ['member-project-events', resolvedParams.id],
        queryFn: () => fetchProjectEvents(resolvedParams.id, 'upcoming'),
    });

    const stateQuery = useQuery({
        queryKey: ['member-project-state', resolvedParams.id, memberId],
        enabled: Boolean(memberId),
        queryFn: () => fetchProjectMemberState(resolvedParams.id, memberId ?? ''),
    });

    const submissionsQuery = useQuery({
        queryKey: ['member-project-submissions', resolvedParams.id, memberId],
        enabled: Boolean(memberId),
        queryFn: () => fetchProjectActivitySubmissions(resolvedParams.id, memberId),
    });

    const requestMutation = useMutation({
        mutationFn: async () => {
            if (!user?.memberId) {
                throw new Error('Your member profile is not linked yet.');
            }

            return requestProjectParticipation({
                projectId: resolvedParams.id,
                memberId: user.memberId,
                note: requestNote.trim() || undefined,
            });
        },
        onSuccess: () => {
            setRequestNote('');
            queryClient.invalidateQueries({ queryKey: ['member-project-state', resolvedParams.id, memberId] });
        },
        onError: (error) => {
            setRequestError(error instanceof Error ? error.message : 'Unable to send your request.');
        },
    });

    const activityMutation = useMutation({
        mutationFn: async (event: { id: string; eventType: string; scoreValue: number; title: string }) => {
            if (!user?.memberId) {
                throw new Error('Your member profile is not linked yet.');
            }

            return submitProjectActivity({
                projectId: resolvedParams.id,
                projectEventId: event.id,
                memberId: user.memberId,
                scoreAwarded: event.scoreValue,
                activityType:
                    event.eventType === 'webinar'
                        ? 'joined_webinar'
                        : event.eventType === 'meeting'
                            ? 'attended_meeting'
                            : event.eventType === 'workshop'
                                ? 'participated_in_workshop'
                                : 'attended_event',
                notes: `Submitted for ${event.title}`,
            });
        },
        onSuccess: () => {
            setSubmitError('');
            queryClient.invalidateQueries({ queryKey: ['member-project-submissions', resolvedParams.id, memberId] });
            queryClient.invalidateQueries({ queryKey: ['member-project-state', resolvedParams.id, memberId] });
        },
        onError: (error) => {
            setSubmitError(error instanceof Error ? error.message : 'Unable to submit activity.');
        },
    });

    const project = projectQuery.data;
    const events = eventsQuery.data ?? [];
    const state = stateQuery.data;
    const submissions = submissionsQuery.data ?? [];
    const primaryEvent = events[0];
    const primaryEventSubmitted = Boolean(primaryEvent && submissions.some((submission) => submission.projectEventId === primaryEvent.id));
    const canSubmit = Boolean(state?.isParticipant || state?.requestStatus === 'approved');
    const hasPendingRequest = state?.requestStatus === 'pending';
    const canRequestJoin = Boolean(memberId && !canSubmit && !hasPendingRequest);
    const stickyActionLabel = canSubmit && primaryEvent
        ? 'Submit attendance'
        : hasPendingRequest
            ? 'Waiting for approval'
            : 'Request to contribute';
    const stickyActionHint = canSubmit && primaryEvent
        ? primaryEvent.title
        : hasPendingRequest
            ? 'Your request is already under review.'
            : 'Ask to join this project from your member portal.';
    const requestStatusLabel = useMemo(() => {
        if (!state?.requestStatus) {
            return 'No request yet';
        }
        return state.requestStatus;
    }, [state?.requestStatus]);

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                {projectQuery.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading project details...</div>
                ) : !project ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">Project not found.</CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 text-white">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-white/15 text-white" variant="default">
                                            {project.status}
                                        </Badge>
                                        <Badge className="bg-white/15 text-white" variant="default">
                                            {project.type.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <h1 className="mt-4 text-3xl md:text-4xl font-bold">{project.name}</h1>
                                    <p className="mt-3 max-w-3xl text-sm md:text-base text-white/85">
                                        {project.description || 'Active project updates, member requests, and event submissions all in one place.'}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">Date range</p>
                                    <p className="mt-2 text-lg font-semibold">{formatDate(project.startDate)}</p>
                                    <p className="text-sm text-white/80">{project.endDate ? formatDate(project.endDate) : 'Open ended'}</p>
                                </div>
                            </div>
                        </Card>

                        {user?.memberId ? (
                            <div className="hidden md:block sticky top-4 z-40">
                                <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{stickyActionLabel}</p>
                                            <Badge variant={getStatusBadgeVariant(state?.requestStatus || (state?.isParticipant ? 'participant' : 'pending'))}>
                                                {state?.isParticipant ? 'Participant' : requestStatusLabel}
                                            </Badge>
                                        </div>
                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{stickyActionHint}</p>
                                    </div>
                                    {canSubmit && primaryEvent ? (
                                        <Button
                                            type="button"
                                            variant="success"
                                            className="shrink-0"
                                            disabled={activityMutation.isPending || primaryEventSubmitted}
                                            onClick={() => {
                                                setSubmitError('');
                                                activityMutation.mutate({
                                                    id: primaryEvent.id,
                                                    eventType: primaryEvent.eventType,
                                                    scoreValue: primaryEvent.scoreValue,
                                                    title: primaryEvent.title,
                                                });
                                            }}
                                        >
                                            {primaryEventSubmitted ? 'Submitted' : 'Submit attendance'}
                                        </Button>
                                    ) : hasPendingRequest ? (
                                        <Button type="button" variant="outline" className="shrink-0" disabled>
                                            Pending approval
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            className="shrink-0"
                                            disabled={!canRequestJoin || requestMutation.isPending}
                                            onClick={() => {
                                                setRequestError('');
                                                requestMutation.mutate();
                                            }}
                                        >
                                            {requestMutation.isPending ? 'Sending...' : 'Request to contribute'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : null}

                        {!user?.memberId ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your member profile is not linked yet.</p>
                                    <p className="mt-2 text-gray-600 dark:text-gray-400">Please ask an AMP administrator to connect this auth account to your member record.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <CardTitle>Join this project</CardTitle>
                                        <Badge variant={getStatusBadgeVariant(state?.requestStatus || (state?.isParticipant ? 'participant' : 'pending'))}>
                                            {state?.isParticipant ? 'Participant' : requestStatusLabel}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Request to contribute if you want to participate in this project. Once approved, you can submit attendance or participation against upcoming project events.
                                        </p>

                                        {!state?.isParticipant && state?.requestStatus !== 'pending' && state?.requestStatus !== 'approved' ? (
                                            <form
                                                className="space-y-4"
                                                onSubmit={(event: FormEvent) => {
                                                    event.preventDefault();
                                                    requestMutation.mutate();
                                                }}
                                            >
                                                <Textarea
                                                    label="Contribution note"
                                                    placeholder="Share why you want to contribute"
                                                    value={requestNote}
                                                    onChange={(event) => setRequestNote(event.target.value)}
                                                    rows={4}
                                                />
                                                {requestError ? <p className="text-sm text-red-600 dark:text-red-400">{requestError}</p> : null}
                                                <Button type="submit" disabled={requestMutation.isPending}>
                                                    {requestMutation.isPending ? 'Sending request...' : 'Request to contribute'}
                                                </Button>
                                            </form>
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-900/10">
                                                <p className="font-semibold text-green-700 dark:text-green-300">
                                                    {state?.isParticipant ? 'You are participating in this project.' : 'Your participation request is pending.'}
                                                </p>
                                                <p className="mt-1 text-sm text-green-700/80 dark:text-green-300/80">
                                                    {state?.isParticipant
                                                        ? 'You can submit activity against the project events below.'
                                                        : 'An admin will review your request and add you to the project when approved.'}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Quick stats</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming events</p>
                                            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{events.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">My submissions</p>
                                            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{submissions.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Latest score</p>
                                            <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{state?.latestSubmissionScore ?? 0}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Upcoming webinars and meetings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {eventsQuery.isLoading ? (
                                    <p className="text-gray-500">Loading events...</p>
                                ) : events.length ? (
                                    <div className="space-y-3">
                                        {events.map((event) => {
                                            const alreadySubmitted = submissions.some((submission) => submission.projectEventId === event.id);

                                            return (
                                                <div key={event.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant={getStatusBadgeVariant(event.status)}>{event.status}</Badge>
                                                                <Badge variant="default">{event.eventType}</Badge>
                                                            </div>
                                                            <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
                                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{event.description || 'No description added yet.'}</p>
                                                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                                <span className="inline-flex items-center gap-2">
                                                                    <Calendar className="h-4 w-4" />
                                                                    {formatDate(event.eventDate)}
                                                                </span>
                                                                <span className="inline-flex items-center gap-2">
                                                                    <HandHeart className="h-4 w-4" />
                                                                    {event.scoreValue} points
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-2 md:min-w-[220px]">
                                                            <Button
                                                                type="button"
                                                                variant="success"
                                                                disabled={!canSubmit || event.status !== 'upcoming' || alreadySubmitted || activityMutation.isPending}
                                                                onClick={() => {
                                                                    setSubmitError('');
                                                                    activityMutation.mutate({
                                                                        id: event.id,
                                                                        eventType: event.eventType,
                                                                        scoreValue: event.scoreValue,
                                                                        title: event.title,
                                                                    });
                                                                }}
                                                            >
                                                                {alreadySubmitted ? 'Submitted' : activityMutation.isPending ? 'Submitting...' : 'Submit attendance'}
                                                            </Button>
                                                            {!canSubmit ? (
                                                                <p className="text-xs text-gray-500">
                                                                    Request participation before submitting activity.
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No upcoming project events yet.</p>
                                )}
                                {submitError ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{submitError}</p> : null}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>My submissions</CardTitle>
                                <Badge variant="default">{submissions.length}</Badge>
                            </CardHeader>
                            <CardContent>
                                {submissions.length ? (
                                    <div className="space-y-3">
                                        {submissions.map((submission) => (
                                            <div key={submission.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{submission.eventTitle}</p>
                                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                            {submission.eventType} - {formatDate(submission.submittedAt)}
                                                        </p>
                                                        {submission.notes ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{submission.notes}</p> : null}
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant={getStatusBadgeVariant(submission.status)}>{submission.status}</Badge>
                                                        <p className="mt-2 text-lg font-bold text-emerald-600">+{submission.scoreAwarded}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500 dark:border-gray-700">
                                        <CircleDashed className="mx-auto h-6 w-6 text-gray-400" />
                                        <p className="mt-3">No project submissions yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="py-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <ShieldAlert className="h-4 w-4 text-amber-500" />
                                Project participation is tracked for AMP score and activity history.
                            </CardContent>
                        </Card>

                        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur md:hidden dark:border-gray-700 dark:bg-gray-900/95">
                            <div className="mx-auto flex max-w-5xl items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{stickyActionLabel}</p>
                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{stickyActionHint}</p>
                                </div>
                                {canSubmit && primaryEvent ? (
                                    <Button
                                        type="button"
                                        variant="success"
                                        className="shrink-0"
                                        disabled={activityMutation.isPending || primaryEventSubmitted}
                                        onClick={() => {
                                            setSubmitError('');
                                            activityMutation.mutate({
                                                id: primaryEvent.id,
                                                eventType: primaryEvent.eventType,
                                                scoreValue: primaryEvent.scoreValue,
                                                title: primaryEvent.title,
                                            });
                                        }}
                                    >
                                        {primaryEventSubmitted ? 'Submitted' : 'Submit'}
                                    </Button>
                                ) : hasPendingRequest ? (
                                    <Button type="button" variant="outline" className="shrink-0" disabled>
                                        Pending
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        className="shrink-0"
                                        disabled={!canRequestJoin || requestMutation.isPending}
                                        onClick={() => {
                                            setRequestError('');
                                            requestMutation.mutate();
                                        }}
                                    >
                                        {requestMutation.isPending ? 'Sending...' : 'Request'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function Textarea({
    label,
    ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
    return (
        <div>
            {label ? <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label> : null}
            <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                {...props}
            />
        </div>
    );
}
