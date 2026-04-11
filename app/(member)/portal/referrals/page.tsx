'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth/context';
import { createReferral, fetchReferralsPage } from '@/lib/api/referrals';
import { formatDate, formatNumber } from '@/lib/utils';

export default function MemberReferralsPage() {
    const { user } = useAuth();
    const memberId = user?.memberId;
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        referredName: '',
        referredEmail: '',
        referredPhone: '',
    });

    const query = useQuery({
        queryKey: ['member-portal-referrals-page', memberId],
        enabled: Boolean(memberId),
        queryFn: () => fetchReferralsPage({ referrerId: memberId!, limit: 50, offset: 0 }),
    });

    const createMutation = useMutation({
        mutationFn: () =>
            createReferral({
                referrerId: memberId ?? '',
                referredName: form.referredName,
                referredEmail: form.referredEmail,
                referredPhone: form.referredPhone,
                status: 'pending',
            }),
        onSuccess: () => {
            setForm({
                referredName: '',
                referredEmail: '',
                referredPhone: '',
            });
            queryClient.invalidateQueries({ queryKey: ['member-portal-referrals-page', memberId] });
        },
    });

    const referrals = query.data?.data ?? [];
    const approved = referrals.filter((referral) => referral.status === 'approved').length;
    const points = referrals.reduce((sum, referral) => sum + referral.pointsEarned, 0);

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">My Referrals</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">See the people you referred and how each referral is progressing.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Submit a Referral</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {memberId ? (
                            <form
                                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    createMutation.mutate();
                                }}
                            >
                                <Input
                                    label="Referred Name"
                                    value={form.referredName}
                                    onChange={(e) => setForm((value) => ({ ...value, referredName: e.target.value }))}
                                    required
                                />
                                <Input
                                    label="Referred Email"
                                    type="email"
                                    value={form.referredEmail}
                                    onChange={(e) => setForm((value) => ({ ...value, referredEmail: e.target.value }))}
                                />
                                <Input
                                    label="Referred Phone"
                                    value={form.referredPhone}
                                    onChange={(e) => setForm((value) => ({ ...value, referredPhone: e.target.value }))}
                                />
                                <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <p className="text-sm text-gray-500">
                                        Referrals are reviewed by the AMP team before points are awarded.
                                    </p>
                                    <Button type="submit" disabled={createMutation.isPending || !form.referredName}>
                                        {createMutation.isPending ? 'Submitting...' : 'Submit Referral'}
                                    </Button>
                                </div>
                                {createMutation.isError && (
                                    <p className="md:col-span-3 text-sm text-red-500">Unable to submit referral right now.</p>
                                )}
                                {createMutation.isSuccess && (
                                    <p className="md:col-span-3 text-sm text-green-600">Referral submitted successfully.</p>
                                )}
                            </form>
                        ) : (
                            <p className="text-gray-500">Your member profile must be linked before you can submit referrals.</p>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card padding="md">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Referrals</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(referrals.length)}</p>
                    </Card>
                    <Card padding="md">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Points Earned</p>
                        <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-500">{formatNumber(points)}</p>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Referral List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {query.isLoading ? (
                            <p className="text-gray-500">Loading referrals...</p>
                        ) : referrals.length ? (
                            <div className="space-y-3">
                                {referrals.map((referral) => (
                                    <div key={referral.id} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{referral.referredName}</p>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{referral.referredEmail || referral.referredPhone || 'No contact details'}</p>
                                            <p className="mt-1 text-xs text-gray-500">{formatDate(referral.createdAt)}</p>
                                            {referral.joinedMemberId ? (
                                                <Badge variant="success" className="mt-3">Converted member</Badge>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant="default">{referral.status}</Badge>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">+{referral.pointsEarned}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No referrals found yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Approved Referrals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {approved} of your referrals have been approved so far.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
