import { Activity, DashboardStats, KPI, MemberDashboard, Task } from '@/lib/types';
import { invokeRpc, invokeRpcList } from '@/lib/supabase/rpc';
import { getDateRangePreset } from '@/lib/utils';
import { fetchActivitiesPage } from '@/lib/api/activities';
import { fetchTasksPage } from '@/lib/api/tasks';

interface DashboardStatsRow {
    total_members?: number | null;
    approved_volunteers?: number | null;
    pending_tasks?: number | null;
    donations_this_month?: number | null;
    member_growth?: number | null;
}

interface MemberDashboardRow {
    amp_id?: string | null;
    score?: number | null;
    recent_activities?: Activity[];
    referrals_count?: number | null;
    donations_total?: number | null;
}

function emptyStats(): DashboardStats {
    return {
        totalMembers: 0,
        activeVolunteers: 0,
        pendingTasks: 0,
        donationsThisMonth: 0,
        memberGrowth: 0,
    };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
    const stats = await invokeRpc<DashboardStatsRow>('rpc_get_dashboard_stats');

    return {
        totalMembers: stats?.total_members || 0,
        activeVolunteers: stats?.approved_volunteers || 0,
        pendingTasks: stats?.pending_tasks || 0,
        donationsThisMonth: stats?.donations_this_month || 0,
        memberGrowth: stats?.member_growth || 0,
    };
}

export async function fetchMemberDashboard(memberId: string): Promise<MemberDashboard> {
    const data = await invokeRpc<MemberDashboardRow>('rpc_get_member_dashboard', { p_member_id: memberId });

    return {
        ampId: data?.amp_id || '',
        score: data?.score || 0,
        recentActivities: (data?.recent_activities || []) as Activity[],
        referralsCount: data?.referrals_count || 0,
        donationsTotal: data?.donations_total || 0,
    };
}

export async function fetchKPIs(): Promise<KPI[]> {
    const response = await invokeRpcList<KPI>('rpc_get_internal_user_kpis', {
        p_limit: 50,
        p_offset: 0,
    });

    return response.data;
}

export async function fetchDashboardActivityFeed(limit = 10): Promise<Activity[]> {
    const range = getDateRangePreset('30d');
    const response = await fetchActivitiesPage({
        from: range.from,
        to: range.to,
        limit,
        offset: 0,
    });
    return response.data;
}

export async function fetchPendingDashboardTasks(limit = 5): Promise<Task[]> {
    const response = await fetchTasksPage({
        status: 'pending',
        limit,
        offset: 0,
    });
    return response.data;
}

export { emptyStats };
