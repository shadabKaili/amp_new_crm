'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { updatePassword, user } = useAuth();

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            await updatePassword(password);
            const nextRoute = user?.role === 'member' ? '/portal' : '/dashboard';
            router.push(nextRoute);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-green-600 dark:text-green-500 mb-2">
                        Set New Password
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Choose a secure password for your account.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                        New volunteer accounts must replace the temporary password before continuing.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="password"
                        label="New Password"
                        placeholder="Enter a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <Input
                        type="password"
                        label="Confirm New Password"
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        error={error}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        disabled={loading || !password || !confirmPassword}
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
