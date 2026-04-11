import { PaginatedResponse, Project } from '@/lib/types';
import { invokeFunction } from '@/lib/supabase/functions';
import { invokeRpc, invokeRpcList } from '@/lib/supabase/rpc';
import { ProjectsListParams, ProjectWriteInput } from '@/lib/types/contracts';

interface ProjectRow {
    id: number | string;
    name?: string | null;
    description?: string | null;
    status?: string | null;
    type?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    members_count?: number | null;
    volunteers_count?: number | null;
    tasks_count?: number | null;
}

interface ProjectDetailRpc {
    project?: ProjectRow | null;
    tasks?: unknown[];
    members?: unknown[];
    volunteers?: unknown[];
}

export async function fetchProjectsPage(filters: ProjectsListParams = {}): Promise<PaginatedResponse<Project>> {
    const response = await invokeRpcList<ProjectRow>('rpc_get_projects', {
        p_status: filters.status || null,
        p_type: filters.type || null,
        p_limit: filters.limit ?? 12,
        p_offset: filters.offset ?? 0,
    });

    return {
        ...response,
        data: response.data.map((project) => ({
            id: String(project.id ?? ''),
            name: project.name || '',
            description: project.description || '',
            status: (project.status || 'active') as Project['status'],
            type: (project.type || 'community') as Project['type'],
            startDate: project.start_date ? new Date(project.start_date) : new Date(),
            endDate: project.end_date ? new Date(project.end_date) : undefined,
            membersCount: project.members_count || 0,
            volunteersCount: project.volunteers_count || 0,
            tasksCount: project.tasks_count || 0,
        })),
    };
}

export async function fetchProjects(filters?: ProjectsListParams): Promise<Project[]> {
    const page = await fetchProjectsPage(filters);
    return page.data;
}

export async function fetchProjectById(id: string): Promise<Project | null> {
    const data = await invokeRpc<ProjectDetailRpc>('rpc_get_project_detail', { p_project_id: Number(id) });
    if (!data?.project) return null;

    return {
        id: String(data.project.id ?? ''),
        name: data.project.name || '',
        description: data.project.description || '',
        status: (data.project.status || 'active') as Project['status'],
        type: (data.project.type || 'community') as Project['type'],
        startDate: data.project.start_date ? new Date(data.project.start_date) : new Date(),
        endDate: data.project.end_date ? new Date(data.project.end_date) : undefined,
        membersCount: data.members?.length || data.project.members_count || 0,
        volunteersCount: data.volunteers?.length || data.project.volunteers_count || 0,
        tasksCount: data.tasks?.length || data.project.tasks_count || 0,
    };
}

export async function createProject(data: ProjectWriteInput): Promise<Project> {
    return invokeFunction<Project, ProjectWriteInput>('fn_upsert_project', data);
}

export async function updateProject(id: string, data: ProjectWriteInput): Promise<Project> {
    return invokeFunction<Project, ProjectWriteInput>('fn_upsert_project', {
        ...data,
        projectId: id,
    });
}
