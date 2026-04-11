'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { resetPassword } = useAuth();

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess('If an account exists for that email, we sent a password reset link.');
            setEmail('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-green-600 dark:text-green-500 mb-2">Reset Password</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Enter your email and we&apos;ll send a recovery link through AMP&apos;s SMTP service.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="email"
                        label="Email Address"
                        placeholder="your.email@amp.org"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    {error ? (
                        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                            {error}
                        </p>
                    ) : null}

                    {success ? (
                        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
                            {success}
                        </p>
                    ) : null}

                    <Button type="submit" fullWidth disabled={loading || !email}>
                        {loading ? 'Sending link...' : 'Send reset link'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/auth/login" className="text-green-600 hover:text-green-700 font-medium">
                        Back to Login
                    </Link>
                </div>
            </Card>
        </div>
    );
}
