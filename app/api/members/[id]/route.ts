import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function getMemberId(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const memberId = getMemberId(id);

        if (!memberId) {
            return NextResponse.json({ error: 'Member id is required.' }, { status: 400 });
        }

        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('id, full_name')
            .eq('id', memberId)
            .maybeSingle();

        if (memberError) {
            throw memberError;
        }

        if (!member) {
            return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
        }

        const cleanupSteps: Array<PromiseLike<unknown>> = [];

        cleanupSteps.push(supabaseAdmin.from('tasks').update({ related_member_id: null }).eq('related_member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('member_referrals').delete().eq('referrer_member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('member_referrals').update({ joined_member_id: null }).eq('joined_member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('volunteer_applications').update({ referrer_member_id: null }).eq('referrer_member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('project_members').delete().eq('member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('project_participation_requests').delete().eq('member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('project_activity_submissions').delete().eq('member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('member_onboarding_events').delete().eq('member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('member_activities').delete().eq('member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('donations').delete().eq('member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('member_notes').delete().eq('member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('member_scores').delete().eq('member_id', memberId));
        cleanupSteps.push(supabaseAdmin.from('member_status').delete().eq('member_id', memberId));

        const cleanupResults = await Promise.all(cleanupSteps);

        for (const result of cleanupResults) {
            const { error } = result as { error: Error | null };
            if (error) {
                throw error;
            }
        }

        const { error: deleteError } = await supabaseAdmin.from('members').delete().eq('id', memberId);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({
            message: `Deleted ${member.full_name || 'member'} successfully.`,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to delete member.',
            },
            { status: 500 },
        );
    }
}
