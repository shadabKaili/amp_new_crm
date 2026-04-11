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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const memberId = getString(id);
        const body = (await request.json()) as { note?: unknown };
        const note = getString(body.note);

        if (!memberId) {
            return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });
        }

        if (!note) {
            return NextResponse.json({ error: 'A note is required.' }, { status: 400 });
        }

        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('id')
            .eq('id', memberId)
            .maybeSingle();

        if (memberError) {
            throw memberError;
        }

        if (!member) {
            return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
        }

        const { error } = await supabaseAdmin.from('member_notes').insert({
            member_id: memberId,
            note,
        });

        if (error) {
            throw error;
        }

        return NextResponse.json({ message: 'Note added successfully.' });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to add note.',
            },
            { status: 500 },
        );
    }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const memberId = getString(id);

        if (!memberId) {
            return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('member_notes')
            .select('id, member_id, note, created_by, created_at')
            .eq('member_id', memberId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: data ?? [] });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load notes.',
            },
            { status: 500 },
        );
    }
}
