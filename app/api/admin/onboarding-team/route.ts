import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function getString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function getBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        if (value === 'true') return true;
        if (value === 'false') return false;
    }

    return null;
}

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin.rpc('rpc_get_onboarding_team_members', {
            p_limit: 100,
            p_offset: 0,
        });

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: data?.data ?? [] });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load onboarding team.',
            },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as { userId?: unknown; isOnboardingTeam?: unknown };
        const userId = getString(body.userId);
        const isOnboardingTeam = getBoolean(body.isOnboardingTeam);

        if (!userId) {
            return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
        }

        if (isOnboardingTeam === null) {
            return NextResponse.json({ error: 'isOnboardingTeam must be a boolean.' }, { status: 400 });
        }

        const { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (userError) {
            throw userError;
        }

        if (!existingUser.user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const { error } = await supabaseAdmin.from('onboarding_team_members').upsert({
            user_id: userId,
            is_onboarding_team: isOnboardingTeam,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        if (error) {
            throw error;
        }

        return NextResponse.json({ message: 'Onboarding team member updated successfully.' });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to update onboarding team member.',
            },
            { status: 500 },
        );
    }
}
