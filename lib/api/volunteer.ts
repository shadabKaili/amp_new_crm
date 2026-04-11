import { PaginatedResponse, VolunteerApplication } from '@/lib/types';
import { invokeFunction } from '@/lib/supabase/functions';
import { invokeRpcList } from '@/lib/supabase/rpc';
import { VolunteerApplicationWriteInput, VolunteerApplicationsListParams } from '@/lib/types/contracts';

interface VolunteerApplicationRow {
    id: number | string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    referred_by_amp_id?: string | null;
    assigned_team_user_id?: string | null;
    assigned_team_member_name?: string | null;
    skills?: string | null;
    availability?: string | null;
    motivation?: string | null;
    status?: string | null;
    created_at?: string | null;
    reviewed_at?: string | null;
    reviewed_by?: string | null;
    notes?: string | null;
}

export async function fetchVolunteerApplicationsPage(
    filters: VolunteerApplicationsListParams = {},
): Promise<PaginatedResponse<VolunteerApplication>> {
    const response = await invokeRpcList<VolunteerApplicationRow>('rpc_get_volunteer_applications', {
        p_status: filters.status || null,
        p_assigned_team_user_id: filters.assignedTeamUserId || null,
        p_limit: filters.limit ?? 20,
        p_offset: filters.offset ?? 0,
    });

    return {
        ...response,
        data: response.data.map((application) => ({
            id: String(application.id ?? ''),
            name: application.full_name || '',
            email: application.email || '',
            phone: application.phone || '',
            referralAmpId: application.referred_by_amp_id || undefined,
            assignedTeamUserId: application.assigned_team_user_id || undefined,
            assignedTeamMemberName: application.assigned_team_member_name || undefined,
            skills: application.skills ? String(application.skills).split(',').map((skill) => skill.trim()) : [],
            availability: application.availability || '',
            motivation: application.motivation || '',
            status: (application.status || 'pending') as VolunteerApplication['status'],
            submittedAt: new Date(application.created_at || new Date()),
            reviewedAt: application.reviewed_at ? new Date(application.reviewed_at) : undefined,
            reviewedBy: application.reviewed_by || undefined,
            notes: application.notes || undefined,
        })),
    };
}

export async function fetchVolunteerApplications(filters?: VolunteerApplicationsListParams): Promise<VolunteerApplication[]> {
    const page = await fetchVolunteerApplicationsPage(filters);
    return page.data;
}

export async function createVolunteerApplication(
    data: Omit<VolunteerApplication, 'id' | 'submittedAt' | 'status'>,
): Promise<VolunteerApplication> {
    return invokeFunction<VolunteerApplication, VolunteerApplicationWriteInput>('fn_upsert_volunteer_application', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        referralAmpId: data.referralAmpId,
        assignedTeamUserId: data.assignedTeamUserId,
        skills: data.skills,
        availability: data.availability,
        motivation: data.motivation,
        status: 'pending',
    });
}

export async function updateVolunteerApplication(
    id: string,
    data: Partial<VolunteerApplication>,
): Promise<VolunteerApplication> {
    return invokeFunction<VolunteerApplication, VolunteerApplicationWriteInput>('fn_upsert_volunteer_application', {
        applicationId: id,
        name: data.name ?? '',
        email: data.email,
        phone: data.phone,
        referralAmpId: data.referralAmpId,
        assignedTeamUserId: data.assignedTeamUserId,
        skills: data.skills ?? [],
        availability: data.availability,
        motivation: data.motivation,
        status: data.status,
        notes: data.notes,
        createFollowUpTask: data.status === 'approved',
    });
}
