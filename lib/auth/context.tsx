'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import {
    login as authLogin,
    signup as authSignup,
    logout as authLogout,
    getCurrentUser,
    updateCurrentUserProfile as authUpdateCurrentUserProfile,
    resetPassword as authResetPassword,
    updatePassword as authUpdatePassword,
    subscribeToAuthChanges,
    verifyOTP as authVerifyOtp,
} from './supabase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password?: string) => Promise<User | null>;
    signup: (email: string, firstName: string, lastName: string, password?: string, avatarUrl?: string) => Promise<void>;
    verifyOtp: (email: string, token: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updatePassword: (password: string) => Promise<void>;
    updateProfile: (input: { fullName: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        const initAuth = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const unsubscribe = subscribeToAuthChanges((nextUser) => {
            setUser(nextUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (email: string, password?: string) => {
        setLoading(true);
        try {
            const nextUser = await authLogin(email, password);
            setUser(nextUser);
            return nextUser;
        } finally {
            setLoading(false);
        }
    };

    const signup = async (email: string, firstName: string, lastName: string, password?: string, avatarUrl?: string) => {
        setLoading(true);
        try {
            await authSignup(email, firstName, lastName, password, avatarUrl);
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (email: string, token: string) => {
        setLoading(true);
        try {
            const nextUser = await authVerifyOtp(email, token);
            setUser(nextUser);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authLogout();
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (email: string) => {
        setLoading(true);
        try {
            await authResetPassword(email);
        } finally {
            setLoading(false);
        }
    };

    const updatePassword = async (password: string) => {
        setLoading(true);
        try {
            await authUpdatePassword(password);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (input: { fullName: string; avatarUrl?: string }) => {
        setLoading(true);
        try {
            await authUpdateCurrentUserProfile(input);
            setUser(prev => prev ? { ...prev, name: input.fullName, avatarUrl: input.avatarUrl } : null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, verifyOtp, logout, resetPassword, updatePassword, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
