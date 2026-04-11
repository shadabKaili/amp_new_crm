'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, Calendar, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { isInternalUser } from '@/lib/auth/supabase';
import { createDonation, fetchDonationsPage } from '@/lib/api/donations';
import { Donation } from '@/lib/types';
import { formatCurrency, formatDate, getDateRangePreset } from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export default function DonationsPage() {
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [periodFilter, setPeriodFilter] = useState<'30d' | '90d'>('30d');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState({
        memberId: '',
        amount: '',
        paymentMethod: 'online' as Donation['paymentMethod'],
        receiptNumber: '',
        purpose: '',
        notes: '',
    });
    const range = useMemo(() => getDateRangePreset(periodFilter), [periodFilter]);
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['donations', user?.id, periodFilter],
        enabled: Boolean(user),
        queryFn: () =>
            fetchDonationsPage({
                ...range,
                memberId: user && !isInternalUser(user) ? user.id : undefined,
                limit: 50,
                offset: 0,
            }),
    });

    const donations = (query.data?.data ?? []).filter((donation) => {
        if (!search) return true;
        const value = search.toLowerCase();
        return donation.memberName.toLowerCase().includes(value) || donation.receiptNumber?.toLowerCase().includes(value);
    });

    const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);

    const createMutation = useMutation({
        mutationFn: () =>
            createDonation({
                memberId: form.memberId,
                memberName: '',
                amount: Number(form.amount),
                date: new Date(),
                paymentMethod: form.paymentMethod,
                receiptNumber: form.receiptNumber,
                purpose: form.purpose,
                notes: form.notes,
            }),
        onSuccess: () => {
            setIsCreateOpen(false);
            setForm({ memberId: '', amount: '', paymentMethod: 'online', receiptNumber: '', purpose: '', notes: '' });
            queryClient.invalidateQueries({ queryKey: ['donations'] });
        },
    });

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Donations</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {user && isInternalUser(user) ? 'Manage all member donations' : 'View your donation history'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" className="hidden sm:flex">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        {user && isInternalUser(user) && (
                            <Button onClick={() => setIsCreateOpen(true)}>
                                <Plus className="w-5 h-5 mr-2" />
                                Add Record
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card padding="md"><p className="text-sm text-gray-600 dark:text-gray-400">Total Volume</p><p className="text-2xl font-bold mt-2 text-green-600 dark:text-green-500">{formatCurrency(totalAmount)}</p></Card>
                    <Card padding="md"><p className="text-sm text-gray-600 dark:text-gray-400">Total Count</p><p className="text-2xl font-bold mt-2">{donations.length}</p></Card>
                    <Card padding="md"><p className="text-sm text-gray-600 dark:text-gray-400">Average Donation</p><p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-500">{donations.length ? formatCurrency(totalAmount / donations.length) : '-'}</p></Card>
                </div>

                <Card className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search member or receipt..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <Select
                            options={[
                                { value: '30d', label: 'Last 30 Days' },
                                { value: '90d', label: 'Last 90 Days' },
                            ]}
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value as '30d' | '90d')}
                        />
                    </div>
                </Card>

                {query.isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading records...</div>
                ) : query.error ? (
                    <Card><div className="text-center py-12 text-red-500">Unable to load donations.</div></Card>
                ) : donations.length === 0 ? (
                    <Card><div className="text-center py-12 text-gray-500">No donation records found</div></Card>
                ) : (
                    <Card padding="sm" className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="text-left p-4 text-sm font-semibold">Date</th>
                                        <th className="text-left p-4 text-sm font-semibold">Member</th>
                                        <th className="text-left p-4 text-sm font-semibold">Amount</th>
                                        <th className="text-left p-4 text-sm font-semibold">Method</th>
                                        <th className="text-left p-4 text-sm font-semibold">Receipt No.</th>
                                        <th className="text-left p-4 text-sm font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donations.map((donation) => (
                                        <tr key={donation.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400"><div className="flex items-center"><Calendar className="w-4 h-4 mr-2" />{formatDate(donation.date)}</div></td>
                                            <td className="p-4 text-sm font-medium">{donation.memberName}</td>
                                            <td className="p-4 text-sm font-bold text-green-600 dark:text-green-500">{formatCurrency(donation.amount)}</td>
                                            <td className="p-4 text-sm capitalize">{donation.paymentMethod.replace('_', ' ')}</td>
                                            <td className="p-4 text-sm font-mono text-gray-500 dark:text-gray-400">{donation.receiptNumber || '-'}</td>
                                            <td className="p-4"><Badge variant="default">Completed</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Donation">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        createMutation.mutate();
                    }}
                >
                    <Input label="Member UUID" helperText="Use the member's internal UUID for now." value={form.memberId} onChange={(e) => setForm((value) => ({ ...value, memberId: e.target.value }))} required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input type="number" step="0.01" label="Amount" value={form.amount} onChange={(e) => setForm((value) => ({ ...value, amount: e.target.value }))} required />
                        <Select
                            label="Payment Method"
                            options={[
                                { value: 'online', label: 'Online' },
                                { value: 'upi', label: 'UPI' },
                                { value: 'bank_transfer', label: 'Bank Transfer' },
                                { value: 'cash', label: 'Cash' },
                                { value: 'cheque', label: 'Cheque' },
                            ]}
                            value={form.paymentMethod}
                            onChange={(e) => setForm((value) => ({ ...value, paymentMethod: e.target.value as Donation['paymentMethod'] }))}
                        />
                    </div>
                    <Input label="Receipt Number" value={form.receiptNumber} onChange={(e) => setForm((value) => ({ ...value, receiptNumber: e.target.value }))} />
                    <Input label="Purpose" value={form.purpose} onChange={(e) => setForm((value) => ({ ...value, purpose: e.target.value }))} />
                    <Input label="Notes" value={form.notes} onChange={(e) => setForm((value) => ({ ...value, notes: e.target.value }))} />
                    {createMutation.error && <p className="text-sm text-red-500">Unable to create donation.</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Donation'}</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
