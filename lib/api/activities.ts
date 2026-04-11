import { Activity, PaginatedResponse } from '@/lib/types';
import { invokeRpcList } from '@/lib/supabase/rpc';
import { ActivitiesListParams } from '@/lib/types/contracts';

interface RecentActivityRow {
    id: number | string;
    member_id?: string | null;
    full_name?: string | null;
    activity_type?: string | null;
    activity_label?: string | null;
    description?: string | null;
    score_earned?: number | null;
    created_at?: string | null;
    metadata?: Record<string, unknown> | null;
}

export async function fetchActivitiesPage(filters: ActivitiesListParams): Promise<PaginatedResponse<Activity>> {
    if (!filters.from || !filters.to) {
        throw new Error('Activity queries require both from and to date filters.');
    }

    const response = await invokeRpcList<RecentActivityRow>('rpc_get_recent_activity', {
        p_member_id: filters.memberId || null,
        p_type: filters.type || null,
        p_from: filters.from,
        p_to: filters.to,
        p_limit: filters.limit ?? 20,
        p_offset: filters.offset ?? 0,
    });

    return {
        ...response,
        data: response.data.map((activity) => ({
            id: String(activity.id ?? ''),
            memberId: activity.member_id || '',
            memberName: activity.full_name || 'Unknown',
            type: (activity.activity_type || 'other') as Activity['type'],
            title: activity.activity_label || activity.activity_type || 'Activity',
            description: activity.description || undefined,
            scoreEarned: activity.score_earned || 0,
            date: new Date(activity.created_at || new Date()),
            metadata: activity.metadata || {},
        })),
    };
}

export async function fetchActivities(filters: ActivitiesListParams): Promise<Activity[]> {
    const page = await fetchActivitiesPage(filters);
    return page.data;
}
