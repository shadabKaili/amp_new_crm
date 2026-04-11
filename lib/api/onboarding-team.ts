import { invokeRpcList } from '@/lib/supabase/rpc';
import type { OnboardingTeamMember } from '@/lib/types';

interface OnboardingTeamMemberRow {
    user_id: string;
    team_member_name?: string | null;
    email?: string | null;
    is_onboarding_team?: boolean | null;
    last_assigned_at?: string | null;
    assigned_volunteer_apps?: number | null;
}

export async function fetchOnboardingTeamMembers(limit = 100, offset = 0) {
    const response = await invokeRpcList<OnboardingTeamMemberRow>('rpc_get_onboarding_team_members', {
        p_limit: limit,
        p_offset: offset,
    });

    return {
        ...response,
        data: response.data.map((row) => ({
            userId: row.user_id,
            teamMemberName: row.team_member_name || row.email || row.user_id,
            email: row.email ?? null,
            isOnboardingTeam: Boolean(row.is_onboarding_team),
            lastAssignedAt: row.last_assigned_at ?? null,
            assignedVolunteerApps: row.assigned_volunteer_apps ?? 0,
        })) as OnboardingTeamMember[],
    };
}

export async function updateOnboardingTeamMember(userId: string, isOnboardingTeam: boolean) {
    const response = await fetch('/api/admin/onboarding-team', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, isOnboardingTeam }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to update onboarding team member.');
    }

    return response.json() as Promise<{ message: string }>;
}
