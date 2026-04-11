import { invokeFunction } from '@/lib/supabase/functions';
import { invokeRpc, invokeRpcList } from '@/lib/supabase/rpc';
import type {
    ProjectActivitySubmission,
    ProjectEvent,
    ProjectMemberState,
    ProjectParticipationRequest,
} from '@/lib/types';
import type {
    ProjectActivitySubmissionInput,
    ProjectEventWriteInput,
    ProjectParticipationRequestInput,
} from '@/lib/types/contracts';

interface ProjectEventRow {
    id: number | string;
    project_id?: number | string | null;
    title?: string | null;
    description?: string | null;
    event_type?: string | null;
    event_date?: string | null;
    score_value?: number | null;
    status?: string | null;
    submissions_count?: number | null;
}

interface ProjectParticipationRow {
    id: number | string;
    project_id?: number | string | null;
    member_id?: string | null;
    member_name?: string | null;
    member_email?: string | null;
    note?: string | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

interface ProjectActivitySubmissionRow {
    id: number | string;
    project_id?: number | string | null;
    project_event_id?: number | string | null;
    member_id?: string | null;
    member_name?: string | null;
    event_title?: string | null;
    event_type?: string | null;
    activity_type?: string | null;
    notes?: string | null;
    score_awarded?: number | null;
    status?: string | null;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    reviewed_by?: string | null;
}

interface ProjectMemberStateRow {
    is_participant?: boolean | null;
    request_status?: string | null;
    request_id?: number | string | null;
    latest_submission_at?: string | null;
    latest_submission_score?: number | null;
}

function mapEvent(row: ProjectEventRow): ProjectEvent {
    return {
        id: String(row.id ?? ''),
        projectId: String(row.project_id ?? ''),
        title: row.title || '',
        description: row.description || undefined,
        eventType: (row.event_type || 'event') as ProjectEvent['eventType'],
        eventDate: new Date(row.event_date || new Date()),
        scoreValue: Number(row.score_value ?? 0),
        status: (row.status || 'upcoming') as ProjectEvent['status'],
        submissionsCount: row.submissions_count ?? 0,
    };
}

function mapRequest(row: ProjectParticipationRow): ProjectParticipationRequest {
    return {
        id: String(row.id ?? ''),
        projectId: String(row.project_id ?? ''),
        memberId: String(row.member_id ?? ''),
        memberName: row.member_name || 'Unknown',
        memberEmail: row.member_email || undefined,
        note: row.note || undefined,
        status: (row.status || 'pending') as ProjectParticipationRequest['status'],
        createdAt: new Date(row.created_at || new Date()),
        updatedAt: new Date(row.updated_at || row.created_at || new Date()),
    };
}

function mapSubmission(row: ProjectActivitySubmissionRow): ProjectActivitySubmission {
    return {
        id: String(row.id ?? ''),
        projectId: String(row.project_id ?? ''),
        projectEventId: String(row.project_event_id ?? ''),
        memberId: String(row.member_id ?? ''),
        memberName: row.member_name || 'Unknown',
        eventTitle: row.event_title || '',
        eventType: (row.event_type || 'event') as ProjectActivitySubmission['eventType'],
        activityType: (row.activity_type || 'attended_event') as ProjectActivitySubmission['activityType'],
        notes: row.notes || undefined,
        scoreAwarded: Number(row.score_awarded ?? 0),
        status: (row.status || 'submitted') as ProjectActivitySubmission['status'],
        submittedAt: new Date(row.submitted_at || new Date()),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
        reviewedBy: row.reviewed_by || undefined,
    };
}

export async function fetchProjectEvents(projectId: string, status?: string): Promise<ProjectEvent[]> {
    const response = await invokeRpcList<ProjectEventRow>('rpc_get_project_events', {
        p_project_id: Number(projectId),
        p_status: status || null,
        p_limit: 100,
        p_offset: 0,
    });

    return response.data.map(mapEvent);
}

export async function fetchProjectParticipationRequests(projectId: string, status?: string): Promise<ProjectParticipationRequest[]> {
    const response = await invokeRpcList<ProjectParticipationRow>('rpc_get_project_participation_requests', {
        p_project_id: Number(projectId),
        p_status: status || null,
        p_limit: 100,
        p_offset: 0,
    });

    return response.data.map(mapRequest);
}

export async function fetchProjectActivitySubmissions(projectId: string, memberId?: string): Promise<ProjectActivitySubmission[]> {
    const response = await invokeRpcList<ProjectActivitySubmissionRow>('rpc_get_project_activity_submissions', {
        p_project_id: Number(projectId),
        p_member_id: memberId || null,
        p_limit: 100,
        p_offset: 0,
    });

    return response.data.map(mapSubmission);
}

export async function fetchProjectMemberState(projectId: string, memberId: string): Promise<ProjectMemberState> {
    const data = await invokeRpc<ProjectMemberStateRow>('rpc_get_project_member_state', {
        p_project_id: Number(projectId),
        p_member_id: memberId,
    });

    return {
        isParticipant: Boolean(data?.is_participant),
        requestStatus: (data?.request_status || undefined) as ProjectMemberState['requestStatus'],
        requestId: data?.request_id != null ? String(data.request_id) : undefined,
        latestSubmissionAt: data?.latest_submission_at ? new Date(data.latest_submission_at) : undefined,
        latestSubmissionScore: data?.latest_submission_score ?? undefined,
    };
}

export async function upsertProjectEvent(data: ProjectEventWriteInput): Promise<ProjectEvent> {
    return invokeFunction<ProjectEvent, ProjectEventWriteInput>('fn_upsert_project_event', data);
}

export async function requestProjectParticipation(data: ProjectParticipationRequestInput): Promise<ProjectParticipationRequest> {
    return invokeFunction<ProjectParticipationRequest, ProjectParticipationRequestInput>('fn_request_project_participation', data);
}

export async function submitProjectActivity(data: ProjectActivitySubmissionInput): Promise<ProjectActivitySubmission> {
    return invokeFunction<ProjectActivitySubmission, ProjectActivitySubmissionInput>('fn_submit_project_activity', data);
}
