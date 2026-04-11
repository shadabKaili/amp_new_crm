'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { createTask, fetchTasksPage, updateTask } from '@/lib/api/tasks';
import { Task } from '@/lib/types';
import { Plus, Clock, User, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export default function TasksPage() {
    const [statusFilter, setStatusFilter] = useState('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        remarks: '',
    });
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['tasks', statusFilter],
        queryFn: () => fetchTasksPage({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 30, offset: 0 }),
    });

    const mutation = useMutation({
        mutationFn: ({ taskId, status }: { taskId: string; status: Task['status'] }) => updateTask(taskId, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    });

    const createMutation = useMutation({
        mutationFn: () =>
            createTask({
                title: form.title,
                description: form.description,
                status: 'pending',
                priority: form.priority as Task['priority'],
                dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
                remarks: form.remarks,
            }),
        onSuccess: () => {
            setIsCreateOpen(false);
            setForm({ title: '', description: '', priority: 'medium', dueDate: '', remarks: '' });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    const tasks = query.data?.data ?? [];

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Internal work queue managed via RPC reads and Edge Function writes.</p>
                    </div>
                    <Button className="hidden md:flex" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-5 h-5 mr-2" />
                        New Task
                    </Button>
                </div>

                <Card className="mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Filter by:</span>
                        </div>
                        <div className="w-full md:w-64">
                            <Select
                                options={[
                                    { value: 'all', label: 'All Statuses' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'in_progress', label: 'In Progress' },
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'delayed', label: 'Delayed' },
                                ]}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                {query.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading tasks...</div>
                ) : query.error ? (
                    <Card><div className="text-center py-12 text-red-500">Unable to load tasks.</div></Card>
                ) : tasks.length === 0 ? (
                    <Card><div className="text-center py-12 text-gray-500">No tasks found</div></Card>
                ) : (
                    <div className="space-y-4">
                        {tasks.map((task) => (
                            <Card key={task.id} padding="md" className="hover:shadow-md transition-shadow border-l-4" style={{
                                borderLeftColor: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#9ca3af'
                            }}>
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{task.title}</h3>
                                        {task.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>}
                                        <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-600 dark:text-gray-400 mt-4 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-md w-fit">
                                            {task.relatedMemberName && <div className="flex items-center"><User className="w-3.5 h-3.5 mr-1 text-gray-400" />{task.relatedMemberName}</div>}
                                            {task.relatedProjectName && <div>Project: {task.relatedProjectName}</div>}
                                            {task.assignedToName && <div>To: {task.assignedToName}</div>}
                                            {task.dueDate && <div className="flex items-center text-orange-600 dark:text-orange-400"><Clock className="w-3.5 h-3.5 mr-1" />{formatDate(task.dueDate)}</div>}
                                        </div>
                                    </div>

                                    <div className="flex lg:flex-col items-center lg:items-end justify-between gap-4">
                                        <Badge variant={getStatusBadgeVariant(task.status)}>{task.status.replace('_', ' ')}</Badge>
                                        <div className="flex gap-2">
                                            {task.status === 'pending' && (
                                                <Button size="sm" variant="secondary" onClick={() => mutation.mutate({ taskId: task.id, status: 'in_progress' })}>
                                                    Start
                                                </Button>
                                            )}
                                            {task.status === 'in_progress' && (
                                                <Button size="sm" variant="success" onClick={() => mutation.mutate({ taskId: task.id, status: 'completed' })}>
                                                    Complete
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Task">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        createMutation.mutate();
                    }}
                >
                    <Input label="Title" value={form.title} onChange={(e) => setForm((value) => ({ ...value, title: e.target.value }))} required />
                    <Input label="Description" value={form.description} onChange={(e) => setForm((value) => ({ ...value, description: e.target.value }))} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Priority"
                            options={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                            ]}
                            value={form.priority}
                            onChange={(e) => setForm((value) => ({ ...value, priority: e.target.value }))}
                        />
                        <Input type="date" label="Due Date" value={form.dueDate} onChange={(e) => setForm((value) => ({ ...value, dueDate: e.target.value }))} />
                    </div>
                    <Input label="Remarks" value={form.remarks} onChange={(e) => setForm((value) => ({ ...value, remarks: e.target.value }))} />
                    {createMutation.error && <p className="text-sm text-red-500">Unable to create task.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Task'}</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
