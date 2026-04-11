'use client';

import { FormEvent, use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TabsContainer } from '@/components/ui/Tabs';
import { fetchProjectById } from '@/lib/api/projects';
import { fetchTasksByProject } from '@/lib/api/tasks';
import {
    fetchProjectActivitySubmissions,
    fetchProjectEvents,
    fetchProjectParticipationRequests,
    requestProjectParticipation,
    upsertProjectEvent,
} from '@/lib/api/project-engagement';
import { Calendar, CircleDashed, FolderKanban, MessageSquare, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [activeTab, setActiveTab] = useState('overview');
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        eventType: 'webinar' as 'webinar' | 'meeting' | 'event' | 'workshop',
        eventDate: '',
        scoreValue: 50,
        status: 'upcoming' as 'upcoming' | 'completed' | 'cancelled',
    });
    const queryClient = useQueryClient();

    const projectQuery = useQuery({ queryKey: ['project', resolvedParams.id], queryFn: () => fetchProjectById(resolvedParams.id) });
    const tasksQuery = useQuery({ queryKey: ['project-tasks', resolvedParams.id], queryFn: () => fetchTasksByProject(resolvedParams.id) });
    const eventsQuery = useQuery({ queryKey: ['project-events', resolvedParams.id], queryFn: () => fetchProjectEvents(resolvedParams.id) });
    const requestsQuery = useQuery({ queryKey: ['project-requests', resolvedParams.id], queryFn: () => fetchProjectParticipationRequests(resolvedParams.id) });
    const submissionsQuery = useQuery({ queryKey: ['project-submissions', resolvedParams.id], queryFn: () => fetchProjectActivitySubmissions(resolvedParams.id) });

    const eventMutation = useMutation({
        mutationFn: () =>
            upsertProjectEvent({
                projectId: resolvedParams.id,
                title: eventForm.title,
                description: eventForm.description,
                eventType: eventForm.eventType,
                eventDate: new Date(eventForm.eventDate).toISOString(),
                scoreValue: eventForm.scoreValue,
                status: eventForm.status,
            }),
        onSuccess: () => {
            setEventForm({
                title: '',
                description: '',
                eventType: 'webinar',
                eventDate: '',
                scoreValue: 50,
                status: 'upcoming',
            });
            queryClient.invalidateQueries({ queryKey: ['project-events', resolvedParams.id] });
            queryClient.invalidateQueries({ queryKey: ['project', resolvedParams.id] });
        },
    });

    const requestMutation = useMutation({
        mutationFn: (input: { requestId: string; memberId: string; status: 'approved' | 'rejected'; note?: string }) =>
            requestProjectParticipation({
                requestId: input.requestId,
                projectId: resolvedParams.id,
                memberId: input.memberId,
                status: input.status,
                note: input.note,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-requests', resolvedParams.id] });
            queryClient.invalidateQueries({ queryKey: ['project', resolvedParams.id] });
        },
    });

    const project = projectQuery.data;
    const tasks = tasksQuery.data ?? [];
    const events = eventsQuery.data ?? [];
    const requests = requestsQuery.data ?? [];
    const submissions = submissionsQuery.data ?? [];

    if (projectQuery.isLoading) {
        return <AppLayout><div className="flex items-center justify-center min-h-[50vh]"><div className="text-gray-500">Loading project details...</div></div></AppLayout>;
    }

    if (!project) {
        return <AppLayout><div className="text-center py-12 text-gray-500">Project not found</div></AppLayout>;
    }

    const tabs = [
        {
            value: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-4 pt-4">
                    <Card padding="md">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
                        <p className="text-gray-700 dark:text-gray-300">{project.description || 'No description provided.'}</p>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card padding="md"><div className="flex items-center text-gray-600 dark:text-gray-400 mb-2"><Users className="w-5 h-5 mr-2" /><span className="text-sm">Members</span></div><p className="text-2xl font-bold">{project.membersCount}</p></Card>
                        <Card padding="md"><div className="flex items-center text-gray-600 dark:text-gray-400 mb-2"><FolderKanban className="w-5 h-5 mr-2" /><span className="text-sm">Events</span></div><p className="text-2xl font-bold">{events.length}</p></Card>
                        <Card padding="md"><div className="flex items-center text-gray-600 dark:text-gray-400 mb-2"><MessageSquare className="w-5 h-5 mr-2" /><span className="text-sm">Requests</span></div><p className="text-2xl font-bold">{requests.length}</p></Card>
                        <Card padding="md"><div className="flex items-center text-gray-600 dark:text-gray-400 mb-2"><CircleDashed className="w-5 h-5 mr-2" /><span className="text-sm">Submissions</span></div><p className="text-2xl font-bold">{submissions.length}</p></Card>
                    </div>
                </div>
            ),
        },
        {
            value: 'tasks',
            label: `Tasks (${tasks.length})`,
            content: (
                <div className="space-y-3 pt-4">
                    {tasks.length ? tasks.map((task) => (
                        <Card key={task.id} padding="md">
                            <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{task.title}</h4>
                                <Badge variant={getStatusBadgeVariant(task.status)}>{task.status.replace('_', ' ')}</Badge>
                            </div>
                            {task.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>}
                        </Card>
                    )) : <Card padding="lg"><div className="text-center text-gray-500 py-8">No tasks created for this project yet.</div></Card>}
                </div>
            ),
        },
        {
            value: 'events',
            label: `Events (${events.length})`,
            content: (
                <div className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add event</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="space-y-4"
                                onSubmit={(event: FormEvent) => {
                                    event.preventDefault();
                                    eventMutation.mutate();
                                }}
                            >
                                <Input
                                    label="Event title"
                                    value={eventForm.title}
                                    onChange={(e) => setEventForm((value) => ({ ...value, title: e.target.value }))}
                                    required
                                />
                                <Input
                                    label="Description"
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm((value) => ({ ...value, description: e.target.value }))}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select
                                        label="Type"
                                        options={[
                                            { value: 'webinar', label: 'Webinar' },
                                            { value: 'meeting', label: 'Meeting' },
                                            { value: 'event', label: 'Event' },
                                            { value: 'workshop', label: 'Workshop' },
                                        ]}
                                        value={eventForm.eventType}
                                        onChange={(e) => setEventForm((value) => ({ ...value, eventType: e.target.value as typeof value.eventType }))}
                                    />
                                    <Select
                                        label="Status"
                                        options={[
                                            { value: 'upcoming', label: 'Upcoming' },
                                            { value: 'completed', label: 'Completed' },
                                            { value: 'cancelled', label: 'Cancelled' },
                                        ]}
                                        value={eventForm.status}
                                        onChange={(e) => setEventForm((value) => ({ ...value, status: e.target.value as typeof value.status }))}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        type="datetime-local"
                                        label="Event date"
                                        value={eventForm.eventDate}
                                        onChange={(e) => setEventForm((value) => ({ ...value, eventDate: e.target.value }))}
                                        required
                                    />
                                    <Input
                                        type="number"
                                        label="Score value"
                                        min={0}
                                        value={eventForm.scoreValue}
                                        onChange={(e) => setEventForm((value) => ({ ...value, scoreValue: Number(e.target.value) }))}
                                    />
                                </div>
                                {eventMutation.error ? <p className="text-sm text-red-600 dark:text-red-400">Unable to save event.</p> : null}
                                <Button type="submit" disabled={eventMutation.isPending}>
                                    {eventMutation.isPending ? 'Saving...' : 'Add event'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {events.length ? (
                        <div className="space-y-3">
                            {events.map((eventItem) => (
                                <Card key={eventItem.id} padding="md">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getStatusBadgeVariant(eventItem.status)}>{eventItem.status}</Badge>
                                                <Badge variant="default">{eventItem.eventType}</Badge>
                                            </div>
                                            <h4 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{eventItem.title}</h4>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{eventItem.description || 'No description.'}</p>
                                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="inline-flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    {formatDate(eventItem.eventDate)}
                                                </span>
                                                <span className="inline-flex items-center gap-2">
                                                    <Users className="h-4 w-4" />
                                                    {eventItem.scoreValue} points
                                                </span>
                                                <span className="inline-flex items-center gap-2">
                                                    <CircleDashed className="h-4 w-4" />
                                                    {eventItem.submissionsCount || 0} submissions
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card padding="lg"><div className="text-center text-gray-500 py-8">No events created yet.</div></Card>
                    )}
                </div>
            ),
        },
        {
            value: 'requests',
            label: `Requests (${requests.length})`,
            content: (
                <div className="space-y-3 pt-4">
                    {requests.length ? requests.map((request) => (
                        <Card key={request.id} padding="md">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
                                    </div>
                                    <h4 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{request.memberName}</h4>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{request.memberEmail || 'No email provided'}</p>
                                    {request.note ? <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{request.note}</p> : null}
                                    <p className="mt-2 text-xs text-gray-500">{formatDate(request.createdAt)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="success"
                                        disabled={requestMutation.isPending || request.status === 'approved'}
                                        onClick={() => requestMutation.mutate({ requestId: request.id, memberId: request.memberId, status: 'approved', note: request.note })}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={requestMutation.isPending || request.status === 'rejected'}
                                        onClick={() => requestMutation.mutate({ requestId: request.id, memberId: request.memberId, status: 'rejected', note: request.note })}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )) : <Card padding="lg"><div className="text-center text-gray-500 py-8">No participation requests yet.</div></Card>}
                </div>
            ),
        },
        {
            value: 'activity',
            label: `Activity (${submissions.length})`,
            content: (
                <div className="space-y-3 pt-4">
                    {submissions.length ? submissions.map((submission) => (
                        <Card key={submission.id} padding="md">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={getStatusBadgeVariant(submission.status)}>{submission.status}</Badge>
                                        <Badge variant="default">{submission.activityType}</Badge>
                                    </div>
                                    <h4 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{submission.memberName}</h4>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{submission.eventTitle}</p>
                                    <p className="mt-2 text-xs text-gray-500">{formatDate(submission.submittedAt)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-emerald-600">+{submission.scoreAwarded}</p>
                                </div>
                            </div>
                        </Card>
                    )) : <Card padding="lg"><div className="text-center text-gray-500 py-8">No submissions logged yet.</div></Card>}
                </div>
            ),
        },
    ];

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto">
                <Card className="mb-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                                <Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge>
                                <Badge variant="default">{project.type.replace('_', ' ')}</Badge>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{project.name}</h1>
                            <div className="flex items-center text-gray-600 dark:text-gray-400"><Calendar className="w-4 h-4 mr-2" />{formatDate(project.startDate)}{project.endDate && ` - ${formatDate(project.endDate)}`}</div>
                        </div>
                    </div>
                </Card>
                <TabsContainer activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
            </div>
        </AppLayout>
    );
}
