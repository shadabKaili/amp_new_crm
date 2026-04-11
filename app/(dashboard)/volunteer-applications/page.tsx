'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Check, X, Search, FileText, Calendar, Inbox } from 'lucide-react';
import { fetchVolunteerApplicationsPage, updateVolunteerApplication } from '@/lib/api/volunteer';
import { formatDate } from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/lib/auth/context';

export default function VolunteerApplicationsPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');
    const [assignedFilter, setAssignedFilter] = useState<'all' | 'mine'>('all');
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const query = useQuery({
        queryKey: ['volunteer-applications', statusFilter, assignedFilter, user?.id],
        queryFn: () =>
            fetchVolunteerApplicationsPage({
                status: statusFilter === 'all' ? undefined : statusFilter,
                assignedTeamUserId: assignedFilter === 'mine' ? user?.id : undefined,
                limit: 50,
                offset: 0,
            }),
        enabled: assignedFilter !== 'mine' || Boolean(user?.id),
    });

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => updateVolunteerApplication(id, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteer-applications'] }),
    });

    const applications = useMemo(() => {
        return (query.data?.data ?? []).filter((application) => {
            if (!search) return true;
            const value = search.toLowerCase();
            return application.name.toLowerCase().includes(value) || application.skills.some((skill) => skill.toLowerCase().includes(value));
        });
    }, [query.data?.data, search]);

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Volunteer Applications</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Review and manage incoming volunteer requests.</p>
                </div>

                <Card className="mb-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or skills..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <Select
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'pending', label: 'Pending Review' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'rejected', label: 'Rejected' },
                            ]}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        />
                        <div className="flex items-stretch gap-3">
                            <Button
                                type="button"
                                variant={assignedFilter === 'mine' ? 'primary' : 'outline'}
                                className="flex-1"
                                onClick={() => setAssignedFilter((current) => (current === 'mine' ? 'all' : 'mine'))}
                                disabled={!user?.id}
                            >
                                Assigned to me
                            </Button>
                            <Button
                                type="button"
                                variant={assignedFilter === 'all' ? 'primary' : 'outline'}
                                className="flex-1"
                                onClick={() => setAssignedFilter('all')}
                            >
                                All
                            </Button>
                        </div>
                    </div>
                    {assignedFilter === 'mine' && !user?.id ? (
                        <p className="mt-3 text-sm text-gray-500">Sign in to view applications assigned to you.</p>
                    ) : null}
                </Card>

                {query.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading applications...</div>
                ) : query.error ? (
                    <Card><div className="text-center py-12 text-red-500">Unable to load volunteer applications.</div></Card>
                ) : applications.length === 0 ? (
                    <Card><div className="flex flex-col items-center justify-center py-16 text-gray-500"><Inbox className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" /><p className="text-lg">No applications found.</p></div></Card>
                ) : (
                    <div className="space-y-4">
                        {applications.map((application) => (
                            <Card key={application.id} padding="lg">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{application.name}</h3>
                                            <Badge variant={getStatusBadgeVariant(application.status)}>{application.status}</Badge>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" />Applied on {formatDate(application.submittedAt)}</div>
                                            {application.availability && <div className="hidden sm:block text-emerald-600 dark:text-emerald-500">Availability: {application.availability}</div>}
                                        </div>
                                        {application.assignedTeamMemberName ? (
                                            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                                Assigned to: <span className="font-semibold text-gray-900 dark:text-gray-100">{application.assignedTeamMemberName}</span>
                                            </p>
                                        ) : null}
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800 mb-4">
                                            <div className="flex items-center gap-2 mb-2 text-gray-900 dark:text-gray-100 font-medium"><FileText className="w-4 h-4" />Motivation</div>
                                            <p className="text-gray-700 dark:text-gray-300 text-sm italic">&quot;{application.motivation || 'No motivation provided.'}&quot;</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {application.skills.map((skill, index) => (
                                                <span key={`${application.id}-${index}`} className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium rounded-md">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {application.status === 'pending' && (
                                        <div className="flex lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 pt-4 lg:pt-0 lg:pl-6">
                                            <Button variant="success" className="w-full justify-center" onClick={() => mutation.mutate({ id: application.id, status: 'approved' })}>
                                                <Check className="w-4 h-4 mr-2" />Approve
                                            </Button>
                                            <Button variant="danger" className="w-full justify-center" onClick={() => mutation.mutate({ id: application.id, status: 'rejected' })}>
                                                <X className="w-4 h-4 mr-2" />Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
