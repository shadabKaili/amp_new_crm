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
            .from('member_messages')
            .select('id, member_id, channel, direction, message, sent_at, created_by, created_at')
            .eq('member_id', memberId)
            .order('sent_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ data: data ?? [] });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load messages.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const memberId = getString(id);
        const body = (await request.json()) as {
            channel?: unknown;
            direction?: unknown;
            message?: unknown;
            sentAt?: unknown;
        };

        if (!memberId) {
            return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });
        }

        const channel = getString(body.channel) || 'whatsapp';
        const direction = getString(body.direction) || 'sent';
        const message = getString(body.message);
        const sentAt = typeof body.sentAt === 'string' ? body.sentAt.trim() : '';

        if (!message) {
            return NextResponse.json({ error: 'A message is required.' }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('member_messages').insert({
            member_id: memberId,
            channel,
            direction,
            message,
            sent_at: sentAt || undefined,
        });

        if (error) {
            throw error;
        }

        return NextResponse.json({ message: 'Message history entry added successfully.' });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to add message history.' },
            { status: 500 },
        );
    }
}
