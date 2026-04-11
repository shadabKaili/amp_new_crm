'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth/context';

const MAX_AVATAR_BYTES = 1024 * 1024;

export default function SignupPage() {
    const router = useRouter();
    const { signup } = useAuth();
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarName, setAvatarName] = useState('');
    const [avatarError, setAvatarError] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const previewName = useMemo(() => {
        const fullName = `${form.firstName} ${form.lastName}`.trim();
        return fullName || 'New Member';
    }, [form.firstName, form.lastName]);

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            setAvatarUrl('');
            setAvatarName('');
            setAvatarError('');
            return;
        }

        if (!file.type.startsWith('image/')) {
            setAvatarError('Please choose an image file.');
            event.target.value = '';
            return;
        }

        if (file.size > MAX_AVATAR_BYTES) {
            setAvatarError('Profile picture must be 1 MB or smaller.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setAvatarUrl(typeof reader.result === 'string' ? reader.result : '');
            setAvatarName(file.name);
            setAvatarError('');
        };
        reader.onerror = () => {
            setAvatarError('Unable to read the selected file.');
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            await signup(
                form.email.trim(),
                form.firstName.trim(),
                form.lastName.trim(),
                form.password,
                avatarUrl || undefined,
            );
            setSuccess('Account created successfully. You can sign in now.');
            setTimeout(() => router.push('/auth/login'), 1000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unable to create your account right now.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
            <Card className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-green-600 dark:text-green-500 mb-2">Create Your Account</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Sign up for AMP CRM and access your member portal.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            value={form.firstName}
                            onChange={(e) => setForm((value) => ({ ...value, firstName: e.target.value }))}
                            required
                        />
                        <Input
                            label="Last Name"
                            value={form.lastName}
                            onChange={(e) => setForm((value) => ({ ...value, lastName: e.target.value }))}
                            required
                        />
                    </div>

                    <Input
                        type="email"
                        label="Email Address"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => setForm((value) => ({ ...value, email: e.target.value }))}
                        required
                    />

                    <div>
                        <label htmlFor="profile-picture" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Profile Picture
                        </label>
                        <input
                            id="profile-picture"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-green-50 file:px-3 file:py-2 file:font-medium file:text-green-700 hover:file:bg-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:file:bg-green-900/30 dark:file:text-green-300"
                        />
                        {!avatarError && (
                            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                Optional. Upload a square image up to 1 MB.
                            </p>
                        )}
                        {avatarError && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{avatarError}</p>}
                    </div>

                    {(avatarUrl || avatarName) && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                            <div className="flex items-center gap-4">
                                <div
                                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-green-100 text-lg font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                    style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                                >
                                    {!avatarUrl && <span>{previewName.slice(0, 2).toUpperCase()}</span>}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{previewName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{avatarName || 'Profile preview'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Input
                        type="password"
                        label="Password"
                        placeholder="Create a password"
                        value={form.password}
                        onChange={(e) => setForm((value) => ({ ...value, password: e.target.value }))}
                        required
                    />

                    <Input
                        type="password"
                        label="Confirm Password"
                        placeholder="Re-enter your password"
                        value={form.confirmPassword}
                        onChange={(e) => setForm((value) => ({ ...value, confirmPassword: e.target.value }))}
                        required
                    />

                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

                    <Button
                        type="submit"
                        fullWidth
                        disabled={
                            loading ||
                            Boolean(avatarError) ||
                            !form.firstName.trim() ||
                            !form.lastName.trim() ||
                            !form.email.trim() ||
                            !form.password ||
                            !form.confirmPassword
                        }
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <Link href="/auth/login" className="text-green-600 hover:text-green-700 font-medium">
                        Already have an account? Sign in
                    </Link>
                </div>
            </Card>
        </div>
    );
}
