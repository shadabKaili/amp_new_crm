'use client';

import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createVolunteerApplication } from '@/lib/api/volunteer';

export default function VolunteerFormPage() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        referralAmpId: '',
        availability: '',
        motivation: '',
        skills: '',
    });

    const mutation = useMutation({
        mutationFn: () =>
            createVolunteerApplication({
                name: form.name,
                email: form.email,
                phone: form.phone,
                referralAmpId: form.referralAmpId || undefined,
                availability: form.availability,
                motivation: form.motivation,
                skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
            }),
    });

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        await mutation.mutateAsync();
        setForm({
            name: '',
            email: '',
            phone: '',
            referralAmpId: '',
            availability: '',
            motivation: '',
            skills: '',
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="text-center mb-4">
                            <h1 className="text-2xl font-bold text-green-600 dark:text-green-500">AMP CRM</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Association of Muslim Professionals</p>
                        </div>
                        <CardTitle>Volunteer Application</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Join us in making a difference in the community.</p>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <Input label="Full Name" required value={form.name} onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))} />
                            <Input type="email" label="Email Address" required value={form.email} onChange={(e) => setForm((value) => ({ ...value, email: e.target.value }))} />
                            <Input type="tel" label="Phone Number" required value={form.phone} onChange={(e) => setForm((value) => ({ ...value, phone: e.target.value }))} />
                            <Input label="Referral AMP ID (Optional)" placeholder="If referred by a member" value={form.referralAmpId} onChange={(e) => setForm((value) => ({ ...value, referralAmpId: e.target.value }))} />
                            <Input label="Skills" placeholder="Communication, event support, outreach" value={form.skills} onChange={(e) => setForm((value) => ({ ...value, skills: e.target.value }))} />
                            <Input label="Availability" placeholder="Weekends, evenings, Fridays" value={form.availability} onChange={(e) => setForm((value) => ({ ...value, availability: e.target.value }))} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Why do you want to volunteer? *</label>
                                <textarea
                                    value={form.motivation}
                                    onChange={(e) => setForm((value) => ({ ...value, motivation: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>
                            {mutation.isSuccess && <p className="text-sm text-green-600 dark:text-green-400">Application submitted successfully.</p>}
                            {mutation.error && <p className="text-sm text-red-600 dark:text-red-400">Unable to submit your application right now.</p>}
                            <Button type="submit" fullWidth disabled={mutation.isPending}>
                                {mutation.isPending ? 'Submitting...' : 'Submit Application'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
