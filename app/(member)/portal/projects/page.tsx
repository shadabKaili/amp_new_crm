'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/context';
import { fetchProjectsPage } from '@/lib/api/projects';
import { fetchProjectMemberState } from '@/lib/api/project-engagement';
import { formatDate } from '@/lib/utils';
import { ArrowRight, Calendar, FolderKanban, Users } from 'lucide-react';
import type { Project, ProjectMemberState } from '@/lib/types';

type MemberProjectCard = Project & { state?: ProjectMemberState };

export default function MemberProjectsPage() {
    const { user } = useAuth();
    const memberId = user?.memberId;

    const query = useQuery<MemberProjectCard[]>({
        queryKey: ['member-active-projects', memberId],
        queryFn: async () => {
            const projects = await fetchProjectsPage({ status: 'active', limit: 50, offset: 0 });
            if (!memberId) {
                return projects.data as MemberProjectCard[];
            }

            return Promise.all(
                projects.data.map(async (project) => ({
                    ...project,
                    state: await fetchProjectMemberState(project.id, memberId),
                })),
            );
        },
    });

    const projects = query.data ?? [];

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 text-white p-6 md:p-8 shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                                <FolderKanban className="h-3.5 w-3.5" />
                                Projects
                            </div>
                            <h1 className="mt-4 text-3xl md:text-4xl font-bold">Active projects and programs</h1>
                            <p className="mt-2 max-w-2xl text-sm md:text-base text-white/85">
                                Browse active AMP projects, request to contribute, and join upcoming webinars or meetings.
                            </p>
                        </div>
                    </div>
                </div>

                {query.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading projects...</div>
                ) : query.error ? (
                    <Card>
                        <CardContent className="py-12 text-center text-red-500">Unable to load active projects.</CardContent>
                    </Card>
                ) : projects.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">No active projects are available right now.</CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {projects.map((project) => {
                            const state = project.state;
                            const ctaLabel = state?.isParticipant || state?.requestStatus === 'approved'
                                ? 'Submit attendance'
                                : state?.requestStatus === 'pending'
                                    ? 'View pending request'
                                    : 'Request to contribute';

                            const ctaVariant = state?.isParticipant || state?.requestStatus === 'approved'
                                ? 'success'
                                : state?.requestStatus === 'pending'
                                    ? 'warning'
                                    : 'default';

                            return (
                                <Link key={project.id} href={`/portal/projects/${project.id}`}>
                                    <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-3">
                                                <Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge>
                                                <Badge variant="default">{project.type.replace('_', ' ')}</Badge>
                                            </div>
                                            <CardTitle className="mt-3">{project.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                                {project.description || 'This project is open for member participation.'}
                                            </p>
                                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        {formatDate(project.startDate)}
                                                        {project.endDate ? ` - ${formatDate(project.endDate)}` : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4" />
                                                    <span>{project.membersCount} participants</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                <span className={`text-sm font-medium ${ctaVariant === 'success' ? 'text-emerald-600' : ctaVariant === 'warning' ? 'text-amber-600' : 'text-green-600'}`}>
                                                    {ctaLabel}
                                                </span>
                                                <ArrowRight className={`h-4 w-4 ${ctaVariant === 'success' ? 'text-emerald-600' : ctaVariant === 'warning' ? 'text-amber-600' : 'text-green-600'}`} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
