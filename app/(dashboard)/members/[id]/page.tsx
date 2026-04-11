'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { TabsContainer } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchMemberById } from '@/lib/api/members';
import { fetchDonations } from '@/lib/api/donations';
import { fetchTasksByMember, createTask } from '@/lib/api/tasks';
import {
    fetchMemberBlacklist,
    fetchMemberCalls,
    fetchMemberMessages,
    fetchMemberNotes,
    blacklistMember,
    createMemberCall,
    createMemberMessage,
    createMemberNote,
    unblacklistMember,
} from '@/lib/api/member-history';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    Mail,
    Phone,
    MapPin,
    Calendar,
    Award,
    MessageSquareText,
    NotebookText,
    PhoneCall,
    ListTodo,
    Ban,
    ShieldAlert,
    Undo2,
} from 'lucide-react';
import type { Member, Task } from '@/lib/types';

type CallForm = {
    callAt: string;
    reason: string;
    outcome: string;
    notes: string;
};

type MessageForm = {
    channel: 'whatsapp' | 'email' | 'sms' | 'call';
    direction: 'sent' | 'received';
    sentAt: string;
    message: string;
};

type TaskForm = {
    title: string;
    description: string;
    priority: Task['priority'];
    dueDate: string;
    remarks: string;
};

function toDateTimeLocalValue(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocal(value: string) {
    return value ? new Date(value).toISOString() : new Date().toISOString();
}

function emptyCallForm(): CallForm {
    return {
        callAt: toDateTimeLocalValue(),
        reason: '',
        outcome: '',
        notes: '',
    };
}

function emptyMessageForm(): MessageForm {
    return {
        channel: 'whatsapp',
        direction: 'sent',
        sentAt: toDateTimeLocalValue(),
        message: '',
    };
}

function emptyTaskForm(member?: Member): TaskForm {
    return {
        title: member ? `Follow up with ${member.name}` : '',
        description: '',
        priority: 'medium',
        dueDate: '',
        remarks: '',
    };
}

export default function MemberDetailPage({ params }: { params: { id: string } }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');
    const [noteText, setNoteText] = useState('');
    const [callForm, setCallForm] = useState<CallForm>(emptyCallForm());
    const [messageForm, setMessageForm] = useState<MessageForm>(emptyMessageForm());
    const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm());
    const [blacklistReason, setBlacklistReason] = useState('');
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [isCallOpen, setIsCallOpen] = useState(false);
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [isFollowupOpen, setIsFollowupOpen] = useState(false);
    const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);

    const donationRange = useMemo(() => ({
        from: '2000-01-01T00:00:00.000Z',
        to: new Date().toISOString(),
    }), []);

    const memberQuery = useQuery({
        queryKey: ['member', params.id],
        queryFn: () => fetchMemberById(params.id),
    });

    const donationsQuery = useQuery({
        queryKey: ['member-donations', params.id],
        queryFn: () => fetchDonations({ memberId: params.id, ...donationRange, limit: 100, offset: 0 }),
    });

    const tasksQuery = useQuery({
        queryKey: ['member-tasks', params.id],
        queryFn: () => fetchTasksByMember(params.id),
    });

    const notesQuery = useQuery({
        queryKey: ['member-notes', params.id],
        queryFn: () => fetchMemberNotes(params.id),
    });

    const callsQuery = useQuery({
        queryKey: ['member-calls', params.id],
        queryFn: () => fetchMemberCalls(params.id),
    });

    const messagesQuery = useQuery({
        queryKey: ['member-messages', params.id],
        queryFn: () => fetchMemberMessages(params.id),
    });

    const blacklistQuery = useQuery({
        queryKey: ['member-blacklist', params.id],
        queryFn: () => fetchMemberBlacklist(params.id),
    });

    const member = memberQuery.data;
    const donations = donationsQuery.data ?? [];
    const tasks = tasksQuery.data ?? [];
    const notes = notesQuery.data ?? [];
    const calls = callsQuery.data ?? [];
    const messages = messagesQuery.data ?? [];
    const blacklist = blacklistQuery.data ?? null;

    const totalDonated = donations.reduce((sum, donation) => sum + donation.amount, 0);
    const isBlacklisted = Boolean(blacklist?.is_active);

    const noteMutation = useMutation({
        mutationFn: () => createMemberNote(params.id, noteText),
        onSuccess: async () => {
            setIsNoteOpen(false);
            setNoteText('');
            await queryClient.invalidateQueries({ queryKey: ['member-notes', params.id] });
        },
    });

    const callMutation = useMutation({
        mutationFn: () => createMemberCall(params.id, {
            call_at: toIsoFromDateTimeLocal(callForm.callAt),
            reason: callForm.reason,
            outcome: callForm.outcome || null,
            notes: callForm.notes || null,
        }),
        onSuccess: async () => {
            setIsCallOpen(false);
            setCallForm(emptyCallForm());
            await queryClient.invalidateQueries({ queryKey: ['member-calls', params.id] });
        },
    });

    const messageMutation = useMutation({
        mutationFn: () => createMemberMessage(params.id, {
            channel: messageForm.channel,
            direction: messageForm.direction,
            sent_at: toIsoFromDateTimeLocal(messageForm.sentAt),
            message: messageForm.message,
        }),
        onSuccess: async () => {
            setIsMessageOpen(false);
            setMessageForm(emptyMessageForm());
            await queryClient.invalidateQueries({ queryKey: ['member-messages', params.id] });
        },
    });

    const followupMutation = useMutation({
        mutationFn: () => createTask({
            title: taskForm.title,
            description: taskForm.description,
            status: 'pending',
            priority: taskForm.priority,
            relatedMemberId: params.id,
            dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : undefined,
            remarks: taskForm.remarks || undefined,
        }),
        onSuccess: async () => {
            setIsFollowupOpen(false);
            setTaskForm(emptyTaskForm(member ?? undefined));
            await queryClient.invalidateQueries({ queryKey: ['member-tasks', params.id] });
        },
    });

    const blacklistMutation = useMutation({
        mutationFn: () => blacklistMember(params.id, blacklistReason),
        onSuccess: async () => {
            setIsBlacklistOpen(false);
            setBlacklistReason('');
            await queryClient.invalidateQueries({ queryKey: ['member-blacklist', params.id] });
        },
    });

    const unblacklistMutation = useMutation({
        mutationFn: () => unblacklistMember(params.id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['member-blacklist', params.id] });
        },
    });

    if (memberQuery.isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-gray-500">Loading member details...</div>
                </div>
            </AppLayout>
        );
    }

    if (!member) {
        return (
            <AppLayout>
                <div className="text-center py-12 text-gray-500">Member not found</div>
            </AppLayout>
        );
    }

    const tabs = [
        {
            value: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-4 pt-4">
                    {isBlacklisted ? (
                        <Card padding="md" className="border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20">
                            <div className="flex items-start gap-3">
                                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-red-700 dark:text-red-300">Blacklisted</p>
                                    <p className="text-sm text-red-700/80 dark:text-red-300/80 mt-1">{blacklist?.reason}</p>
                                    <p className="text-xs text-red-600/70 dark:text-red-300/70 mt-1">
                                        Marked on {blacklist ? formatDate(blacklist.blacklisted_at) : ''}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <Card padding="md">
                            <p className="text-sm text-gray-500">Joined AMP</p>
                            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{formatDate(member.joinedAt)}</p>
                        </Card>
                        <Card padding="md">
                            <p className="text-sm text-gray-500">Total donated</p>
                            <p className="mt-2 text-lg font-semibold text-green-600 dark:text-green-500">{formatCurrency(totalDonated)}</p>
                        </Card>
                        <Card padding="md">
                            <p className="text-sm text-gray-500">Score</p>
                            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{member.score}</p>
                        </Card>
                        <Card padding="md">
                            <p className="text-sm text-gray-500">Member status</p>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant={getStatusBadgeVariant(member.status)}>{member.status}</Badge>
                                {isBlacklisted ? <Badge variant="danger">Blacklisted</Badge> : null}
                            </div>
                        </Card>
                    </div>

                    <Card padding="md">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="w-4 h-4 mr-2" />
                                {member.email || 'No email'}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="w-4 h-4 mr-2" />
                                {member.phone || 'No phone'}
                            </div>
                            {member.city ? (
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    {member.city}, {member.state}
                                </div>
                            ) : null}
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="w-4 h-4 mr-2" />
                                Joined on {formatDate(member.joinedAt)}
                            </div>
                        </div>
                    </Card>

                    <Card padding="md">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500">Remarks</p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{notes.length}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Calls</p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{calls.length}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Messages</p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{messages.length}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Follow-ups</p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{tasks.length}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            ),
        },
        {
            value: 'donations',
            label: `Donation History (${donations.length})`,
            content: (
                <div className="space-y-3 pt-4">
                    {donations.length ? donations.map((donation) => (
                        <Card key={donation.id} padding="md" className="border-l-4 border-l-green-500">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-bold text-lg text-green-600 dark:text-green-500">{formatCurrency(donation.amount)}</p>
                                    <p className="text-sm text-gray-500 mt-1">{formatDate(donation.date)} · {donation.paymentMethod.replace('_', ' ')}</p>
                                    <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                        {donation.purpose ? <p>Purpose: {donation.purpose}</p> : null}
                                        {donation.receiptNumber ? <p>Receipt: {donation.receiptNumber}</p> : null}
                                        {donation.notes ? <p>Notes: {donation.notes}</p> : null}
                                    </div>
                                </div>
                                <Badge variant="success">Completed</Badge>
                            </div>
                        </Card>
                    )) : <Card padding="lg"><div className="text-center text-gray-500 py-6">No donations recorded yet.</div></Card>}
                </div>
            ),
        },
        {
            value: 'calls',
            label: `Call History (${calls.length})`,
            content: (
                <div className="space-y-3 pt-4">
                    {calls.length ? calls.map((call) => (
                        <Card key={call.id} padding="md" className="border-l-4 border-l-gray-300 dark:border-l-gray-600">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{call.reason}</p>
                                    <p className="text-sm text-gray-500 mt-1">Call on {formatDate(call.call_at)}</p>
                                    <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                        {call.outcome ? <p>Outcome: {call.outcome}</p> : null}
                                        {call.notes ? <p>Notes: {call.notes}</p> : null}
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setIsCallOpen(true)}>
                                    <PhoneCall className="w-4 h-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </Card>
                    )) : <Card padding="lg"><div className="text-center text-gray-500 py-6">No call history yet.</div></Card>}
                </div>
            ),
        },
        {
            value: 'messages',
            label: `Messages (${messages.length})`,
            content: (
                <div className="space-y-3 pt-4">
                    {messages.length ? messages.map((message) => (
                        <Card key={message.id} padding="md">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="default">{message.channel.toUpperCase()}</Badge>
                                        <Badge variant={message.direction === 'sent' ? 'success' : 'info'}>{message.direction}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">Sent on {formatDate(message.sent_at)}</p>
                                    <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{message.message}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setIsMessageOpen(true)}>
                                    <MessageSquareText className="w-4 h-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </Card>
                    )) : <Card padding="lg"><div className="text-center text-gray-500 py-6">No messages recorded yet.</div></Card>}
                </div>
            ),
        },
        {
            value: 'remarks',
            label: `Remarks (${notes.length})`,
            content: (
                <div className="space-y-3 pt-4">
                    {notes.length ? notes.map((note) => (
                        <Card key={note.id} padding="md">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Internal remark</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{formatDate(note.created_at)}</p>
                                    <p className="mt-3 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{note.note}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setIsNoteOpen(true)}>
                                    <NotebookText className="w-4 h-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </Card>
                    )) : <Card padding="lg"><div className="text-center text-gray-500 py-6">No remarks yet.</div></Card>}
                </div>
            ),
        },
        {
            value: 'followups',
            label: `Follow-up History (${tasks.length})`,
            content: (
                <div className="space-y-3 pt-4">
                    {tasks.length ? tasks.map((task) => (
                        <Card key={task.id} padding="md">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{task.title}</h4>
                                        <Badge variant={getStatusBadgeVariant(task.status)}>{task.status.replace('_', ' ')}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}</p>
                                    <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                        {task.description ? <p>{task.description}</p> : null}
                                        {task.remarks ? <p>Remarks: {task.remarks}</p> : null}
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setIsFollowupOpen(true)}>
                                    <ListTodo className="w-4 h-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </Card>
                    )) : <Card padding="lg"><div className="text-center text-gray-500 py-6">No follow-up tasks yet.</div></Card>}
                </div>
            ),
        },
    ];

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto">
                <Card className="mb-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{member.name}</h1>
                                    <p className="text-gray-600 dark:text-gray-400">{member.ampId}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={getStatusBadgeVariant(member.status)}>{member.status}</Badge>
                                    {isBlacklisted ? <Badge variant="danger">Blacklisted</Badge> : null}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <Mail className="w-4 h-4 mr-2" />
                                    {member.email || 'No email'}
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {member.phone || 'No phone'}
                                </div>
                                {member.city ? (
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                        <MapPin className="w-4 h-4 mr-2" />
                                        {member.city}, {member.state}
                                    </div>
                                ) : null}
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Joined AMP on {formatDate(member.joinedAt)}
                                </div>
                            </div>

                            {isBlacklisted ? (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                                    <strong>Blacklist reason:</strong> {blacklist?.reason}
                                </div>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:w-[260px]">
                            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
                                <Award className="w-6 h-6 text-green-600 dark:text-green-500" />
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">Total donated</p>
                                <p className="text-xl font-bold text-green-600 dark:text-green-500">{formatCurrency(totalDonated)}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                                <NotebookText className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">Internal entries</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{notes.length + calls.length + messages.length + tasks.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsNoteOpen(true)}>
                            <NotebookText className="w-4 h-4 mr-2" />
                            Add remark
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsCallOpen(true)}>
                            <PhoneCall className="w-4 h-4 mr-2" />
                            Log call
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsMessageOpen(true)}>
                            <MessageSquareText className="w-4 h-4 mr-2" />
                            Log message
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsFollowupOpen(true)}>
                            <ListTodo className="w-4 h-4 mr-2" />
                            Add follow-up
                        </Button>
                        {isBlacklisted ? (
                            <Button size="sm" variant="secondary" onClick={() => unblacklistMutation.mutate()} disabled={unblacklistMutation.isPending}>
                                <Undo2 className="w-4 h-4 mr-2" />
                                Remove blacklist
                            </Button>
                        ) : (
                            <Button size="sm" variant="danger" onClick={() => setIsBlacklistOpen(true)}>
                                <Ban className="w-4 h-4 mr-2" />
                                Mark blacklisted
                            </Button>
                        )}
                    </div>
                </Card>

                <TabsContainer activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
            </div>

            <Modal isOpen={isNoteOpen} onClose={() => setIsNoteOpen(false)} title="Add Remark">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        noteMutation.mutate();
                    }}
                >
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remark</label>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                            placeholder="Write an internal remark..."
                        />
                    </div>
                    {noteMutation.error && <p className="text-sm text-red-500">Unable to save remark.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsNoteOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={noteMutation.isPending}>{noteMutation.isPending ? 'Saving...' : 'Save Remark'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isCallOpen} onClose={() => setIsCallOpen(false)} title="Log Call">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        callMutation.mutate();
                    }}
                >
                    <Input type="datetime-local" label="Call Date and Time" value={callForm.callAt} onChange={(e) => setCallForm((value) => ({ ...value, callAt: e.target.value }))} required />
                    <Input label="Reason" value={callForm.reason} onChange={(e) => setCallForm((value) => ({ ...value, reason: e.target.value }))} required />
                    <Input label="Outcome" value={callForm.outcome} onChange={(e) => setCallForm((value) => ({ ...value, outcome: e.target.value }))} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                        <textarea
                            value={callForm.notes}
                            onChange={(e) => setCallForm((value) => ({ ...value, notes: e.target.value }))}
                            rows={4}
                            className="w-full px-4 py-3 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                        />
                    </div>
                    {callMutation.error && <p className="text-sm text-red-500">Unable to save call history.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsCallOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={callMutation.isPending}>{callMutation.isPending ? 'Saving...' : 'Save Call'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isMessageOpen} onClose={() => setIsMessageOpen(false)} title="Log Message">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        messageMutation.mutate();
                    }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Channel"
                            options={[
                                { value: 'whatsapp', label: 'WhatsApp' },
                                { value: 'email', label: 'Email' },
                                { value: 'sms', label: 'SMS' },
                                { value: 'call', label: 'Call' },
                            ]}
                            value={messageForm.channel}
                            onChange={(e) => setMessageForm((value) => ({ ...value, channel: e.target.value as MessageForm['channel'] }))}
                        />
                        <Select
                            label="Direction"
                            options={[
                                { value: 'sent', label: 'Sent' },
                                { value: 'received', label: 'Received' },
                            ]}
                            value={messageForm.direction}
                            onChange={(e) => setMessageForm((value) => ({ ...value, direction: e.target.value as MessageForm['direction'] }))}
                        />
                    </div>
                    <Input type="datetime-local" label="Sent At" value={messageForm.sentAt} onChange={(e) => setMessageForm((value) => ({ ...value, sentAt: e.target.value }))} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
                        <textarea
                            value={messageForm.message}
                            onChange={(e) => setMessageForm((value) => ({ ...value, message: e.target.value }))}
                            rows={5}
                            className="w-full px-4 py-3 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                            placeholder="Write the message text..."
                        />
                    </div>
                    {messageMutation.error && <p className="text-sm text-red-500">Unable to save message.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsMessageOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={messageMutation.isPending}>{messageMutation.isPending ? 'Saving...' : 'Save Message'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isFollowupOpen} onClose={() => setIsFollowupOpen(false)} title="Add Follow-Up">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        followupMutation.mutate();
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
                        <textarea
                            value={taskForm.remarks}
                            onChange={(e) => setTaskForm((value) => ({ ...value, remarks: e.target.value }))}
                            rows={4}
                            className="w-full px-4 py-3 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                        />
                    </div>
                    {followupMutation.error && <p className="text-sm text-red-500">Unable to create follow-up.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsFollowupOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={followupMutation.isPending}>{followupMutation.isPending ? 'Creating...' : 'Create Follow-Up'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isBlacklistOpen} onClose={() => setIsBlacklistOpen(false)} title="Mark Blacklisted">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        blacklistMutation.mutate();
                    }}
                >
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason</label>
                        <textarea
                            value={blacklistReason}
                            onChange={(e) => setBlacklistReason(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                            placeholder="Why should this member be blacklisted?"
                        />
                    </div>
                    {blacklistMutation.error && <p className="text-sm text-red-500">Unable to blacklist member.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsBlacklistOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="danger" disabled={blacklistMutation.isPending}>{blacklistMutation.isPending ? 'Saving...' : 'Mark Blacklisted'}</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
