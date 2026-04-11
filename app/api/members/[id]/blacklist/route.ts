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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const memberId = getString(id);

        if (!memberId) {
            return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('member_blacklists')
            .select('id, member_id, reason, is_active, blacklisted_at, removed_at, created_by, created_at')
            .eq('member_id', memberId)
            .order('blacklisted_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: data ?? null });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load blacklist state.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const memberId = getString(id);
        const body = (await request.json()) as { reason?: unknown };
        const reason = getString(body.reason);

        if (!memberId) {
            return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });
        }

        if (!reason) {
            return NextResponse.json({ error: 'A blacklist reason is required.' }, { status: 400 });
        }

        await supabaseAdmin
            .from('member_blacklists')
            .update({ is_active: false, removed_at: new Date().toISOString() })
            .eq('member_id', memberId)
            .eq('is_active', true);

        const { error } = await supabaseAdmin.from('member_blacklists').insert({
            member_id: memberId,
            reason,
            is_active: true,
            blacklisted_at: new Date().toISOString(),
        });

        if (error) {
            throw error;
        }

        return NextResponse.json({ message: 'Member marked as blacklisted.' });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to blacklist member.' },
            { status: 500 },
        );
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const memberId = getString(id);

        if (!memberId) {
            return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('member_blacklists')
            .update({ is_active: false, removed_at: new Date().toISOString() })
            .eq('member_id', memberId)
            .eq('is_active', true);

        if (error) {
            throw error;
        }

        return NextResponse.json({ message: 'Blacklist removed.' });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to remove blacklist.' },
            { status: 500 },
        );
    }
}
