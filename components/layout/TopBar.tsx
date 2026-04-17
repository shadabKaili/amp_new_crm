'use client';

import { FormEvent, useEffect, useState, useRef } from 'react';
import { LogOut, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { usePathname, useRouter } from 'next/navigation';
import { uploadAvatar } from '@/lib/supabase/storage';

function getPageTitle(pathname: string) {
    if (pathname === '/dashboard') return 'Dashboard Overview';
    if (pathname === '/members') return 'Members';
    if (pathname.startsWith('/members/')) return 'Member Profile';
    if (pathname === '/projects') return 'Projects & Programs';
    if (pathname.startsWith('/projects/')) return 'Project Details';
    if (pathname === '/tasks') return 'Tasks';
    if (pathname === '/activities') return 'Activities';
    if (pathname === '/referrals') return 'Referrals';
    if (pathname === '/donations') return 'Donations';
    if (pathname === '/volunteer-applications') return 'Volunteer Applications';
    if (pathname === '/kpis') return 'KPIs';
    if (pathname === '/portal') return 'Member Portal';
    if (pathname === '/portal/activities') return 'My Activities';
    if (pathname === '/portal/referrals') return 'My Referrals';
    if (pathname === '/portal/donations') return 'My Donations';
    if (pathname === '/volunteer') return 'Volunteer Application';
    if (pathname.startsWith('/auth/')) return 'Account Access';

    return 'AMP CRM';
}

export function TopBar() {
    const { user, logout, updateProfile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) {
            setIsProfileOpen(false);
            return;
        }

        setFullName(user.name);
        setAvatarUrl(user.avatarUrl || '');
    }, [user]);

    const handleLogout = async () => {
        await logout();
        router.push('/auth/login');
    };

    const handleSaveProfile = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setSaving(true);

        try {
            await updateProfile({
                fullName: fullName.trim() || user?.name || 'User',
                avatarUrl: avatarUrl.trim() || undefined,
            });
            setIsProfileOpen(false);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unable to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setError('');
        setUploading(true);
        try {
            const url = await uploadAvatar(file, user.id);
            setAvatarUrl(url);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to upload image.');
        } finally {
            setUploading(false);
        }
    };

    const getRoleBadgeVariant = (role: string) => {
        if (role === 'super_admin') return 'danger' as const;
        if (role === 'manager') return 'info' as const;
        if (role === 'team_member') return 'default' as const;
        return 'default' as const;
    };

    const getRoleLabel = (role: string) => {
        if (role === 'super_admin') return 'Admin';
        if (role === 'manager') return 'Manager';
        if (role === 'team_member') return 'Team Member';
        return 'Member';
    };

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    };

    return (
        <>
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3 lg:px-6">
                {/* Left: Logo (mobile only) */}
                <div className="flex items-center lg:hidden">
                    <h1 className="text-lg font-bold text-green-600 dark:text-green-500">
                        AMP CRM
                    </h1>
                </div>

                {/* Desktop: Page title */}
                <div className="hidden min-w-0 lg:block">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                        Workspace
                    </p>
                    <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {getPageTitle(pathname)}
                    </h2>
                </div>

                {/* Right: User info & logout */}
                <div className="flex items-center space-x-3">
                    {user && (
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={() => setIsProfileOpen(true)}
                                className="flex items-center space-x-2 rounded-xl bg-gray-50 px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700"
                                aria-label="Edit profile"
                            >
                                <div
                                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-green-100 text-sm font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                    style={
                                        user.avatarUrl
                                            ? {
                                                  backgroundImage: `url(${user.avatarUrl})`,
                                                  backgroundSize: 'cover',
                                                  backgroundPosition: 'center',
                                              }
                                            : undefined
                                    }
                                >
                                    {!user.avatarUrl && <span>{getInitials(user.name)}</span>}
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                </div>
                            </button>
                            {/* Role badge - always visible */}
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                                {getRoleLabel(user.role)}
                            </Badge>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
        <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Edit Profile">
            <form className="space-y-4" onSubmit={handleSaveProfile}>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div
                                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-green-100 text-2xl font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-2 ring-white dark:ring-gray-800"
                                style={
                                    avatarUrl.trim()
                                        ? {
                                              backgroundImage: `url(${avatarUrl.trim()})`,
                                              backgroundSize: 'cover',
                                              backgroundPosition: 'center',
                                          }
                                        : undefined
                                }
                            >
                                {!avatarUrl.trim() && <span>{getInitials(fullName || user?.name)}</span>}
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Upload Photo"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">{fullName || user?.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                </div>

                <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your display name"
                    required
                />

                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo</label>
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full justify-start text-gray-600 dark:text-gray-400"
                        >
                            {uploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Camera className="mr-2 h-4 w-4" />
                            )}
                            {avatarUrl ? 'Change profile photo' : 'Upload profile photo'}
                        </Button>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Recommended: Square image, PNG or JPG (max 2MB).
                    </p>
                </div>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsProfileOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving || !fullName.trim()}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
        </>
    );
}
