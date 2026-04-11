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
            .from('member_calls')
            .select('id, member_id, call_at, reason, outcome, notes, created_by, created_at')
            .eq('member_id', memberId)
            .order('call_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: data ?? [] });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load calls.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const memberId = getString(id);
        const body = (await request.json()) as {
            callAt?: unknown;
            reason?: unknown;
            outcome?: unknown;
            notes?: unknown;
        };

        if (!memberId) {
            return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });
        }

        const callAt = typeof body.callAt === 'string' ? body.callAt.trim() : '';
        const reason = getString(body.reason);
        const outcome = getString(body.outcome);
        const notes = getString(body.notes);

        if (!callAt || !reason) {
            return NextResponse.json({ error: 'Call date and reason are required.' }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('member_calls').insert({
            member_id: memberId,
            call_at: callAt,
            reason,
            outcome,
            notes,
        });

        if (error) {
            throw error;
        }

        return NextResponse.json({ message: 'Call history entry added successfully.' });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to add call history.' },
            { status: 500 },
        );
    }
}
