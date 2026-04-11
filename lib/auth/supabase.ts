import { User } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { invokeFunction } from '@/lib/supabase/functions';
import { isInternalRole } from '@/lib/auth/access';

/**
 * Supabase Authentication Integration
 * OTP-based flows remain disabled, but transactional signup/reset email is now enabled through SMTP.
 */

/**
 * Send OTP to email for login
 */
export async function sendOTP(email: string): Promise<void> {
    void email;
    throw new Error('Email OTP is temporarily disabled. Please sign in with password.');
}

/**
 * Public signup creates an auth account plus a linked member record.
 */
export async function signup(
    email: string,
    firstName: string,
    lastName: string,
    password?: string,
    avatarUrl?: string,
): Promise<void> {
    if (!password) {
        throw new Error('Password is required to create an account.');
    }

    await invokeFunction('fn_public_signup', {
        email,
        firstName,
        lastName,
        password,
        avatarUrl: avatarUrl || undefined,
    });
}

/**
 * Verify OTP and complete login
 */
export async function verifyOTP(email: string, token: string): Promise<User> {
    void email;
    void token;
    throw new Error('Email OTP verification is temporarily disabled. Please sign in with password.');
}

export async function login(email: string, password?: string): Promise<User | null> {
    if (!password) {
        throw new Error('Password sign-in is currently required.');
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;

    return getCurrentUser();
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
    const {
        data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
            callback(null);
            return;
        }

        try {
            callback(await getCurrentUser());
        } catch {
            callback(null);
        }
    });

    return () => subscription.unsubscribe();
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
    const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
        throw new Error(payload?.error ?? 'Password reset email could not be sent.');
    }
}

/**
 * Update user password (used after clicking reset link)
 */
export async function updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
        password,
        data: {
            must_change_password: false,
        },
    });
    if (error) throw error;
}

export async function updateCurrentUserProfile(input: {
    fullName: string;
    avatarUrl?: string;
}): Promise<void> {
    const updates = {
        data: {
            full_name: input.fullName,
            avatar_url: input.avatarUrl || null,
        },
    };

    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Get current authenticated user with role determination
 */
export async function getCurrentUser(): Promise<User | null> {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) return null;

    const { data: context, error: contextError } = await supabase.rpc('rpc_get_current_user_context', {
        p_user_id: authUser.id,
        p_email: authUser.email ?? null,
    });

    if (contextError) throw contextError;

    // Determine highest role from the backend-provided role codes.
    const role = determineUserRole(context?.role_codes ?? null);

    // Get user metadata or email for name
    const name = authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0] ||
        'User';
    const avatarUrl = authUser.user_metadata?.avatar_url || undefined;
    const mustChangePassword = Boolean(authUser.user_metadata?.must_change_password);

    return {
        id: authUser.id,
        email: authUser.email!,
        name,
        avatarUrl,
        role,
        memberId: context?.member_id ?? undefined,
        ampId: context?.amp_id ?? undefined,
        mustChangePassword,
        createdAt: new Date(authUser.created_at),
    };
}

/**
 * Determine user's highest role from database roles
 */
function determineUserRole(roleCodes: string[] | null): User['role'] {
    if (!roleCodes || roleCodes.length === 0) return 'member';

    // Check for admin roles first
    if (roleCodes.includes('super_admin') || roleCodes.includes('admin')) {
        return 'super_admin';
    }

    // Then check for manager/team roles
    if (roleCodes.includes('manager') || roleCodes.includes('team')) {
        return 'manager';
    }

    if (roleCodes.includes('team_member')) {
        return 'team_member';
    }

    // Default to member
    return 'member';
}

/**
 * Check if user has required role
 */
export function hasRole(user: User | null, roles: Array<User['role']>): boolean {
    if (!user) return false;
    return roles.includes(user.role);
}

/**
 * Check if user is admin or manager (internal team)
 */
export function isInternalUser(user: User | null): boolean {
    return isInternalRole(user?.role);
}
