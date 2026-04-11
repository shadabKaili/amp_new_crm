'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { createProject, fetchProjectsPage } from '@/lib/api/projects';
import { Project } from '@/lib/types';
import { Plus, Calendar, Users, ListTodo } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function ProjectsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        type: 'community' as Project['type'],
        status: 'planning' as Project['status'],
        startDate: '',
        endDate: '',
    });
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['projects'],
        queryFn: () => fetchProjectsPage({ limit: 18, offset: 0 }),
    });

    const createMutation = useMutation({
        mutationFn: () =>
            createProject({
                name: form.name,
                description: form.description,
                type: form.type,
                status: form.status,
                startDate: form.startDate || null,
                endDate: form.endDate || null,
            }),
        onSuccess: () => {
            setIsCreateOpen(false);
            setForm({ name: '', description: '', type: 'community', status: 'planning', startDate: '', endDate: '' });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    const projects = query.data?.data ?? [];

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Projects & Programs</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage AMP initiatives and events</p>
                    </div>
                    <Button className="hidden md:flex" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-5 h-5 mr-2" />
                        New Project
                    </Button>
                </div>

                {query.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading projects...</div>
                ) : query.error ? (
                    <Card><div className="text-center py-12 text-red-500">Unable to load projects.</div></Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project) => (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                                <Card padding="md" className="h-full cursor-pointer hover:shadow-lg transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <Badge variant={getStatusBadgeVariant(project.status)}>{project.status}</Badge>
                                        <Badge variant="default">{project.type.replace('_', ' ')}</Badge>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{project.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{project.description || 'No description added yet.'}</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                                            <Calendar className="w-4 h-4 mr-2" />
                                            {formatDate(project.startDate)}
                                            {project.endDate && ` - ${formatDate(project.endDate)}`}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                                                <Users className="w-4 h-4 mr-1" />
                                                {project.membersCount} members
                                            </div>
                                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                                                <ListTodo className="w-4 h-4 mr-1" />
                                                {project.tasksCount} tasks
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Project">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        createMutation.mutate();
                    }}
                >
                    <Input label="Project Name" value={form.name} onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))} required />
                    <Input label="Description" value={form.description} onChange={(e) => setForm((value) => ({ ...value, description: e.target.value }))} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Type"
                            options={[
                                { value: 'community', label: 'Community' },
                                { value: 'job_fair', label: 'Job Fair' },
                                { value: 'training', label: 'Training' },
                                { value: 'workshop', label: 'Workshop' },
                                { value: 'industry_connect', label: 'Industry Connect' },
                                { value: 'talent_exam', label: 'Talent Exam' },
                            ]}
                            value={form.type}
                            onChange={(e) => setForm((value) => ({ ...value, type: e.target.value as typeof value.type }))}
                        />
                        <Select
                            label="Status"
                            options={[
                                { value: 'planning', label: 'Planning' },
                                { value: 'active', label: 'Active' },
                                { value: 'on_hold', label: 'On Hold' },
                                { value: 'completed', label: 'Completed' },
                            ]}
                            value={form.status}
                            onChange={(e) => setForm((value) => ({ ...value, status: e.target.value as typeof value.status }))}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input type="date" label="Start Date" value={form.startDate} onChange={(e) => setForm((value) => ({ ...value, startDate: e.target.value }))} />
                        <Input type="date" label="End Date" value={form.endDate} onChange={(e) => setForm((value) => ({ ...value, endDate: e.target.value }))} />
                    </div>
                    {createMutation.error && <p className="text-sm text-red-500">Unable to create project.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Project'}</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
