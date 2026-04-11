import { invokeRpcList } from '@/lib/supabase/rpc';

export interface OnboardingEventRow {
    id: string;
    member_id: string;
    member_amp_id?: string | null;
    member_name?: string | null;
    member_email?: string | null;
    assigned_team_user_id?: string | null;
    team_member_name?: string | null;
    event_type?: string | null;
    notes?: string | null;
    created_at?: string | null;
}

export async function fetchMemberOnboardingEvents(limit = 50, offset = 0) {
    return invokeRpcList<OnboardingEventRow>('rpc_get_member_onboarding_events', {
        p_limit: limit,
        p_offset: offset,
    });
}
