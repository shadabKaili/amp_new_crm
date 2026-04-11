'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Users, Coins } from 'lucide-react';
import { createReferral, fetchReferralsPage } from '@/lib/api/referrals';
import { Referral } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export default function ReferralsPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState({
        referrerId: '',
        referredName: '',
        referredEmail: '',
        referredPhone: '',
        status: 'pending' as Referral['status'],
    });
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['referrals', statusFilter],
        queryFn: () => fetchReferralsPage({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 50, offset: 0 }),
    });

    const referrals = (query.data?.data ?? []).filter((referral) => {
        if (!search) return true;
        const value = search.toLowerCase();
        return (
            referral.referredName.toLowerCase().includes(value) ||
            referral.referredEmail.toLowerCase().includes(value) ||
            referral.referrerName.toLowerCase().includes(value)
        );
    });

    const totalPoints = referrals.reduce((sum, referral) => sum + referral.pointsEarned, 0);

    const createMutation = useMutation({
        mutationFn: () =>
            createReferral({
                referrerId: form.referrerId,
                referredName: form.referredName,
                referredEmail: form.referredEmail,
                referredPhone: form.referredPhone,
                status: form.status,
            }),
        onSuccess: () => {
            setIsCreateOpen(false);
            setForm({ referrerId: '', referredName: '', referredEmail: '', referredPhone: '', status: 'pending' });
            queryClient.invalidateQueries({ queryKey: ['referrals'] });
        },
    });

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Referrals</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Track referral pipeline and member conversions.</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)}><Plus className="w-5 h-5 mr-2" />Refer Someone</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <Card padding="md"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 dark:text-gray-400">Total Referrals</p><p className="text-2xl font-bold mt-2">{referrals.length}</p></div><Users className="w-8 h-8 text-blue-600 opacity-80" /></div></Card>
                    <Card padding="md"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 dark:text-gray-400">Total Points Earned</p><p className="text-2xl font-bold mt-2 text-green-600 dark:text-green-500">{totalPoints}</p></div><Coins className="w-8 h-8 text-green-600 opacity-80" /></div></Card>
                    <Card padding="md"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 dark:text-gray-400">Successful Conversions</p><p className="text-2xl font-bold mt-2 text-purple-600 dark:text-purple-500">{referrals.filter((referral) => referral.status === 'approved').length}</p></div><div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center"><span className="text-purple-600 dark:text-purple-400 font-bold">%</span></div></div></Card>
                </div>

                <Card className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search referrer or referee..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <Select
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'contacted', label: 'Contacted' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'rejected', label: 'Rejected' },
                            ]}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        />
                    </div>
                </Card>

                {query.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading referrals...</div>
                ) : query.error ? (
                    <Card><div className="text-center py-12 text-red-500">Unable to load referrals.</div></Card>
                ) : referrals.length === 0 ? (
                    <Card><div className="text-center py-12 text-gray-500">No referrals found.</div></Card>
                ) : (
                    <Card padding="sm" className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="text-left p-4 text-sm font-semibold">Date Added</th>
                                        <th className="text-left p-4 text-sm font-semibold">Referred By</th>
                                        <th className="text-left p-4 text-sm font-semibold">Referred Name</th>
                                        <th className="text-left p-4 text-sm font-semibold">Contact</th>
                                        <th className="text-left p-4 text-sm font-semibold">Status</th>
                                        <th className="text-left p-4 text-sm font-semibold">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referrals.map((referral) => (
                                        <tr key={referral.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(referral.createdAt)}</td>
                                            <td className="p-4 text-sm font-medium">{referral.referrerName}</td>
                                            <td className="p-4 text-sm font-semibold">{referral.referredName}</td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400"><div>{referral.referredEmail}</div><div>{referral.referredPhone}</div></td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-2">
                                                    <Badge variant={getStatusBadgeVariant(referral.status)}>{referral.status.replace('_', ' ')}</Badge>
                                                    {referral.joinedMemberId ? (
                                                        <Badge variant="success">Converted member</Badge>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-bold text-green-600 dark:text-green-500">{referral.pointsEarned ? `+ ${referral.pointsEarned}` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Referral">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        createMutation.mutate();
                    }}
                >
                    <Input label="Referrer Member UUID" helperText="Use the member UUID until member search is added here." value={form.referrerId} onChange={(e) => setForm((value) => ({ ...value, referrerId: e.target.value }))} required />
                    <Input label="Referred Name" value={form.referredName} onChange={(e) => setForm((value) => ({ ...value, referredName: e.target.value }))} required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input type="email" label="Referred Email" value={form.referredEmail} onChange={(e) => setForm((value) => ({ ...value, referredEmail: e.target.value }))} />
                        <Input label="Referred Phone" value={form.referredPhone} onChange={(e) => setForm((value) => ({ ...value, referredPhone: e.target.value }))} />
                    </div>
                    <Select
                        label="Status"
                        options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'contacted', label: 'Contacted' },
                            { value: 'approved', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' },
                        ]}
                        value={form.status}
                        onChange={(e) => setForm((value) => ({ ...value, status: e.target.value as typeof value.status }))}
                    />
                    {createMutation.error && <p className="text-sm text-red-500">Unable to create referral.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Referral'}</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
