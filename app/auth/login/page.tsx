'use client';

import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const currentUser = await login(email, password);
            if (currentUser?.mustChangePassword) {
                router.push('/auth/reset-password');
                return;
            }
            const nextRoute = currentUser?.role === 'member' ? '/portal' : '/dashboard';
            router.push(nextRoute);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-green-600 dark:text-green-500 mb-2">AMP CRM</h1>
                    <p className="text-gray-600 dark:text-gray-400">Sign in to your AMP CRM account</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">Use your registered email and password to continue.</p>
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

                    <Input
                        type={showPassword ? 'text' : 'password'}
                        label="Password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        error={error}
                        rightElement={
                            <button
                                type="button"
                                role="switch"
                                aria-checked={showPassword}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword((value) => !value)}
                                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                            </button>
                        }
                    />

                    <Button type="submit" fullWidth disabled={loading || !email || !password}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </Button>

                    <div className="text-center mt-4 text-sm">
                        <a href="/auth/forgot-password" className="text-green-600 hover:text-green-700 font-medium">
                            Forgot your password?
                        </a>
                    </div>

                    <div className="text-center text-sm">
                        <Link href="/auth/signup" className="text-green-600 hover:text-green-700 font-medium">
                            Need an account? Sign up
                        </Link>
                    </div>
                </form>
            </Card>
        </div>
    );
}
