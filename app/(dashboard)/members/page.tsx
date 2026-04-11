'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createMember, updateMember, deleteMember, addMemberNote, fetchMembersPage } from '@/lib/api/members';
import { createTask } from '@/lib/api/tasks';
import { Member, Task } from '@/lib/types';
import {
    Search,
    Plus,
    MoreVertical,
    Mail,
    MessageCircle,
    Phone,
    PencilLine,
    NotebookText,
    CalendarClock,
    ListTodo,
    Trash2,
    ExternalLink,
    Upload,
} from 'lucide-react';
import { ImportCsvModal } from '@/components/members/ImportCsvModal';

type MenuPosition = {
    top: number;
    right: number;
};

type MemberFormState = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    status: Member['status'];
};

type TaskFormState = {
    title: string;
    description: string;
    priority: Task['priority'];
    dueDate: string;
};

function normalizePhone(phone: string) {
    return phone.replace(/[^\d+]/g, '');
}

function splitName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    };
}

function makeMemberForm(member?: Member): MemberFormState {
    const split = splitName(member?.name || '');

    return {
        firstName: member?.firstName || split.firstName,
        lastName: member?.lastName || split.lastName,
        email: member?.email || '',
        phone: member?.phone || '',
        city: member?.city || '',
        state: member?.state || '',
        status: member?.status || 'active',
    };
}

function makeTaskForm(member?: Member, kind: 'task' | 'followup' = 'task'): TaskFormState {
    return {
        title: kind === 'followup' ? `Follow up with ${member?.name || 'member'}` : '',
        description: '',
        priority: kind === 'followup' ? 'high' : 'medium',
        dueDate: kind === 'followup' ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : '',
    };
}

export default function MembersPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [offset, setOffset] = useState(0);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [isFollowupOpen, setIsFollowupOpen] = useState(false);
    const [isTaskOpen, setIsTaskOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [openMenuMemberId, setOpenMenuMemberId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [createForm, setCreateForm] = useState<MemberFormState>(makeMemberForm());
    const [editForm, setEditForm] = useState<MemberFormState>(makeMemberForm());
    const [noteText, setNoteText] = useState('');
    const [followupForm, setFollowupForm] = useState<TaskFormState>(makeTaskForm(undefined, 'followup'));
    const [taskForm, setTaskForm] = useState<TaskFormState>(makeTaskForm());
    const [deleteError, setDeleteError] = useState('');
    const limit = 20;

    const query = useQuery({
        queryKey: ['members', search, statusFilter, offset],
        queryFn: () =>
            fetchMembersPage({
                search: search || undefined,
                status: statusFilter === 'all' ? undefined : statusFilter,
                limit,
                offset,
            }),
    });

    const members = query.data?.data ?? [];
    const total = query.data?.total ?? 0;
    const activeMenuMember = members.find((member) => member.id === openMenuMemberId) ?? selectedMember;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenMenuMemberId(null);
                setMenuPosition(null);
            }
        };

        const handleResize = () => {
            setOpenMenuMemberId(null);
            setMenuPosition(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const closeMenu = () => {
        setOpenMenuMemberId(null);
        setMenuPosition(null);
    };

    const openMenu = (member: Member, trigger: HTMLButtonElement) => {
        const rect = trigger.getBoundingClientRect();
        const estimatedWidth = 272;
        const padding = 12;
        const right = Math.max(padding, window.innerWidth - rect.right);
        const top = Math.min(rect.bottom + 8, Math.max(padding, window.innerHeight - 364));

        setSelectedMember(member);
        setMenuPosition({
            top,
            right: Math.min(right, Math.max(padding, window.innerWidth - estimatedWidth - padding)),
        });
        setOpenMenuMemberId(member.id);
    };

    const openEdit = (member: Member) => {
        setSelectedMember(member);
        setEditForm(makeMemberForm(member));
        setIsEditOpen(true);
    };

    const openNote = (member: Member) => {
        setSelectedMember(member);
        setNoteText(`Remark for ${member.name}`);
        setIsNoteOpen(true);
    };

    const openFollowup = (member: Member) => {
        setSelectedMember(member);
        setFollowupForm(makeTaskForm(member, 'followup'));
        setIsFollowupOpen(true);
    };

    const openTask = (member: Member) => {
        setSelectedMember(member);
        setTaskForm({
            ...makeTaskForm(member, 'task'),
            title: member ? `Task for ${member.name}` : '',
        });
        setIsTaskOpen(true);
    };

    const openDelete = (member: Member) => {
        setSelectedMember(member);
        setDeleteError('');
        setIsDeleteOpen(true);
    };

    const createMutation = useMutation({
        mutationFn: () =>
            createMember({
                name: `${createForm.firstName} ${createForm.lastName}`.trim(),
                firstName: createForm.firstName,
                lastName: createForm.lastName,
                email: createForm.email,
                phone: createForm.phone,
                city: createForm.city,
                state: createForm.state,
                status: createForm.status,
                type: 'member',
                score: 0,
            }),
        onSuccess: async () => {
            setIsCreateOpen(false);
            setCreateForm(makeMemberForm());
            await queryClient.invalidateQueries({ queryKey: ['members'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: () => {
            if (!selectedMember) {
                throw new Error('No member selected.');
            }

            return updateMember(selectedMember.id, {
                name: `${editForm.firstName} ${editForm.lastName}`.trim(),
                firstName: editForm.firstName,
                lastName: editForm.lastName,
                email: editForm.email,
                phone: editForm.phone,
                city: editForm.city,
                state: editForm.state,
                status: editForm.status,
            });
        },
        onSuccess: async () => {
            setIsEditOpen(false);
            setSelectedMember(null);
            await queryClient.invalidateQueries({ queryKey: ['members'] });
            await queryClient.invalidateQueries({ queryKey: ['member'] });
        },
    });

    const noteMutation = useMutation({
        mutationFn: () => {
            if (!selectedMember) {
                throw new Error('No member selected.');
            }

            return addMemberNote(selectedMember.id, noteText);
        },
        onSuccess: async () => {
            setIsNoteOpen(false);
            setSelectedMember(null);
            setNoteText('');
            await queryClient.invalidateQueries({ queryKey: ['member'] });
        },
    });

    const followupMutation = useMutation({
        mutationFn: () => {
            if (!selectedMember) {
                throw new Error('No member selected.');
            }

            return createTask({
                title: followupForm.title,
                description: followupForm.description,
                status: 'pending',
                priority: followupForm.priority,
                relatedMemberId: selectedMember.id,
                dueDate: followupForm.dueDate ? new Date(followupForm.dueDate) : undefined,
            });
        },
        onSuccess: async () => {
            setIsFollowupOpen(false);
            setSelectedMember(null);
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            await queryClient.invalidateQueries({ queryKey: ['member-related'] });
        },
    });

    const taskMutation = useMutation({
        mutationFn: () => {
            if (!selectedMember) {
                throw new Error('No member selected.');
            }

            return createTask({
                title: taskForm.title,
                description: taskForm.description,
                status: 'pending',
                priority: taskForm.priority,
                relatedMemberId: selectedMember.id,
                dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : undefined,
            });
        },
        onSuccess: async () => {
            setIsTaskOpen(false);
            setSelectedMember(null);
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            await queryClient.invalidateQueries({ queryKey: ['member-related'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => {
            if (!selectedMember) {
                throw new Error('No member selected.');
            }

            return deleteMember(selectedMember.id);
        },
        onSuccess: async () => {
            setIsDeleteOpen(false);
            setSelectedMember(null);
            await queryClient.invalidateQueries({ queryKey: ['members'] });
            await queryClient.invalidateQueries({ queryKey: ['member'] });
        },
        onError: (error) => {
            setDeleteError(error instanceof Error ? error.message : 'Failed to delete member.');
        },
    });

    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + limit, total);

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Members</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Paginated member directory powered by RPCs.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="hidden md:flex" onClick={() => setIsImportOpen(true)}>
                            <Upload className="w-5 h-5 mr-2" />
                            Import CSV
                        </Button>
                        <Button className="hidden md:flex" onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-5 h-5 mr-2" />
                            Add Member
                        </Button>
                    </div>
                </div>

                <Card className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setOffset(0);
                                }}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <Select
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'pending', label: 'Pending' },
                            ]}
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setOffset(0);
                            }}
                        />
                    </div>
                </Card>

                {query.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading members...</div>
                ) : query.error ? (
                    <Card><div className="text-center py-12 text-red-500">Unable to load members.</div></Card>
                ) : members.length === 0 ? (
                    <Card><div className="text-center py-12 text-gray-500">No members found</div></Card>
                ) : (
                    <>
                        <div className="hidden lg:block">
                            <Card padding="sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left p-4 text-sm font-semibold">AMP ID</th>
                                                <th className="text-left p-4 text-sm font-semibold">Name</th>
                                                <th className="text-left p-4 text-sm font-semibold">Email</th>
                                                <th className="text-left p-4 text-sm font-semibold">Status</th>
                                                <th className="text-left p-4 text-sm font-semibold">Score</th>
                                                <th className="text-left p-4 text-sm font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {members.map((member) => (
                                                <tr key={member.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="p-4 text-sm font-medium">{member.ampId}</td>
                                                    <td className="p-4 text-sm">{member.name}</td>
                                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{member.email}</td>
                                                    <td className="p-4 text-sm">
                                                        <Badge variant={getStatusBadgeVariant(member.status)}>{member.status}</Badge>
                                                    </td>
                                                    <td className="p-4 text-sm">{member.score}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <Link href={`/members/${member.id}`}>
                                                                <Button size="sm" variant="ghost">View</Button>
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                aria-label={`Open actions for ${member.name}`}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    openMenu(member, event.currentTarget);
                                                                }}
                                                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        <div className="lg:hidden space-y-3">
                            {members.map((member) => (
                                <Card
                                    key={member.id}
                                    padding="md"
                                    className="cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => router.push(`/members/${member.id}`)}
                                >
                                    <div className="flex items-start justify-between mb-3 gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{member.ampId}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={getStatusBadgeVariant(member.status)}>{member.status}</Badge>
                                            <button
                                                type="button"
                                                aria-label={`Open actions for ${member.name}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openMenu(member, event.currentTarget);
                                                }}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-gray-500">Email</p>
                                            <p className="truncate">{member.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Score</p>
                                            <p className="font-semibold">{member.score}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                            <span>Showing {start}-{end} of {total}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - limit))}>Previous</Button>
                                <Button variant="outline" disabled={offset + limit >= total} onClick={() => setOffset((value) => value + limit)}>Next</Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {openMenuMemberId && menuPosition && activeMenuMember ? (
                <div className="fixed inset-0 z-40" onClick={closeMenu}>
                    <div
                        className="fixed z-50 w-68 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
                        style={{
                            top: menuPosition.top,
                            right: menuPosition.right,
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{activeMenuMember.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{activeMenuMember.ampId}</p>
                        </div>
                        {[
                            {
                                label: 'Send email',
                                icon: Mail,
                                href: activeMenuMember.email ? `mailto:${activeMenuMember.email}?subject=${encodeURIComponent(`Hello ${activeMenuMember.name}`)}` : null,
                                disabled: !activeMenuMember.email,
                            },
                            {
                                label: 'Send WhatsApp',
                                icon: MessageCircle,
                                href: normalizePhone(activeMenuMember.phone || '')
                                    ? `https://wa.me/${normalizePhone(activeMenuMember.phone || '').replace(/^\+/, '')}?text=${encodeURIComponent(`Hi ${activeMenuMember.name}, I am reaching out from AMP CRM.`)}`
                                    : null,
                                disabled: !normalizePhone(activeMenuMember.phone || ''),
                            },
                            {
                                label: 'Call',
                                icon: Phone,
                                href: normalizePhone(activeMenuMember.phone || '') ? `tel:${normalizePhone(activeMenuMember.phone || '')}` : null,
                                disabled: !normalizePhone(activeMenuMember.phone || ''),
                            },
                            {
                                label: 'Update information',
                                icon: PencilLine,
                                onClick: () => openEdit(activeMenuMember),
                            },
                            {
                                label: 'Add remarks',
                                icon: NotebookText,
                                onClick: () => openNote(activeMenuMember),
                            },
                            {
                                label: 'Add follow-up',
                                icon: CalendarClock,
                                onClick: () => openFollowup(activeMenuMember),
                            },
                            {
                                label: 'Add task',
                                icon: ListTodo,
                                onClick: () => openTask(activeMenuMember),
                            },
                            {
                                label: 'Delete member',
                                icon: Trash2,
                                tone: 'danger' as const,
                                onClick: () => openDelete(activeMenuMember),
                            },
                        ].map((action) => {
                            const Icon = action.icon;
                            const itemClass = action.tone === 'danger'
                                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700';

                            if (action.href) {
                                const external = action.href.startsWith('http') || action.href.startsWith('mailto:') || action.href.startsWith('tel:');

                                return external ? (
                                    <a
                                        key={action.label}
                                        href={action.href}
                                        onClick={closeMenu}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${itemClass} ${action.disabled ? 'pointer-events-none opacity-50' : ''}`}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{action.label}</span>
                                        <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" />
                                    </a>
                                ) : (
                                    <Link
                                        key={action.label}
                                        href={action.href}
                                        onClick={closeMenu}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${itemClass}`}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{action.label}</span>
                                    </Link>
                                );
                            }

                            return (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => {
                                        closeMenu();
                                        action.onClick?.();
                                    }}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${itemClass}`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span>{action.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Member">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        createMutation.mutate();
                    }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="First Name" value={createForm.firstName} onChange={(e) => setCreateForm((value) => ({ ...value, firstName: e.target.value }))} required />
                        <Input label="Last Name" value={createForm.lastName} onChange={(e) => setCreateForm((value) => ({ ...value, lastName: e.target.value }))} required />
                    </div>
                    <Input type="email" label="Email" value={createForm.email} onChange={(e) => setCreateForm((value) => ({ ...value, email: e.target.value }))} />
                    <Input label="Phone" value={createForm.phone} onChange={(e) => setCreateForm((value) => ({ ...value, phone: e.target.value }))} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="City" value={createForm.city} onChange={(e) => setCreateForm((value) => ({ ...value, city: e.target.value }))} />
                        <Input label="State" value={createForm.state} onChange={(e) => setCreateForm((value) => ({ ...value, state: e.target.value }))} />
                    </div>
                    <Select
                        label="Status"
                        options={[
                            { value: 'active', label: 'Active' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'inactive', label: 'Inactive' },
                        ]}
                        value={createForm.status}
                        onChange={(e) => setCreateForm((value) => ({ ...value, status: e.target.value as Member['status'] }))}
                    />
                    {createMutation.error && <p className="text-sm text-red-500">Unable to create member.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Member'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Member">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        updateMutation.mutate();
                    }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="First Name" value={editForm.firstName} onChange={(e) => setEditForm((value) => ({ ...value, firstName: e.target.value }))} required />
                        <Input label="Last Name" value={editForm.lastName} onChange={(e) => setEditForm((value) => ({ ...value, lastName: e.target.value }))} required />
                    </div>
                    <Input type="email" label="Email" value={editForm.email} onChange={(e) => setEditForm((value) => ({ ...value, email: e.target.value }))} />
                    <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm((value) => ({ ...value, phone: e.target.value }))} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="City" value={editForm.city} onChange={(e) => setEditForm((value) => ({ ...value, city: e.target.value }))} />
                        <Input label="State" value={editForm.state} onChange={(e) => setEditForm((value) => ({ ...value, state: e.target.value }))} />
                    </div>
                    <Select
                        label="Status"
                        options={[
                            { value: 'active', label: 'Active' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'inactive', label: 'Inactive' },
                        ]}
                        value={editForm.status}
                        onChange={(e) => setEditForm((value) => ({ ...value, status: e.target.value as Member['status'] }))}
                    />
                    {updateMutation.error && <p className="text-sm text-red-500">Unable to update member.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isNoteOpen} onClose={() => setIsNoteOpen(false)} title="Add Remarks">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        noteMutation.mutate();
                    }}
                >
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                            placeholder="Write your internal remark here..."
                        />
                    </div>
                    {noteMutation.error && <p className="text-sm text-red-500">Unable to add remark.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsNoteOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={noteMutation.isPending}>{noteMutation.isPending ? 'Saving...' : 'Save Remark'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isFollowupOpen} onClose={() => setIsFollowupOpen(false)} title="Add Follow-Up Task">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        followupMutation.mutate();
                    }}
                >
                    <Input label="Task Title" value={followupForm.title} onChange={(e) => setFollowupForm((value) => ({ ...value, title: e.target.value }))} required />
                    <Input label="Description" value={followupForm.description} onChange={(e) => setFollowupForm((value) => ({ ...value, description: e.target.value }))} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Priority"
                            options={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                            ]}
                            value={followupForm.priority}
                            onChange={(e) => setFollowupForm((value) => ({ ...value, priority: e.target.value as Task['priority'] }))}
                        />
                        <Input type="date" label="Due Date" value={followupForm.dueDate} onChange={(e) => setFollowupForm((value) => ({ ...value, dueDate: e.target.value }))} />
                    </div>
                    {followupMutation.error && <p className="text-sm text-red-500">Unable to add follow-up.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsFollowupOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={followupMutation.isPending}>{followupMutation.isPending ? 'Creating...' : 'Create Follow-Up'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isTaskOpen} onClose={() => setIsTaskOpen(false)} title="Add Task">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        taskMutation.mutate();
                    }}
                >
                    <Input label="Task Title" value={taskForm.title} onChange={(e) => setTaskForm((value) => ({ ...value, title: e.target.value }))} required />
                    <Input label="Description" value={taskForm.description} onChange={(e) => setTaskForm((value) => ({ ...value, description: e.target.value }))} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Priority"
                            options={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                            ]}
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm((value) => ({ ...value, priority: e.target.value as Task['priority'] }))}
                        />
                        <Input type="date" label="Due Date" value={taskForm.dueDate} onChange={(e) => setTaskForm((value) => ({ ...value, dueDate: e.target.value }))} />
                    </div>
                    {taskMutation.error && <p className="text-sm text-red-500">Unable to create task.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsTaskOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={taskMutation.isPending}>{taskMutation.isPending ? 'Creating...' : 'Create Task'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Member">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        This will permanently remove the selected member and clean up related notes, tasks, referrals, donations, and onboarding records.
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedMember ? selectedMember.name : 'Member'}
                    </p>
                    {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button
                            type="button"
                            variant="danger"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate()}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Member'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ImportCsvModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['members'] })}
            />
        </AppLayout>
    );
}
