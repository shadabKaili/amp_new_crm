import { PaginatedResponse, Task } from '@/lib/types';
import { invokeFunction } from '@/lib/supabase/functions';
import { invokeRpc, invokeRpcList } from '@/lib/supabase/rpc';
import { TaskWriteInput, TasksListParams } from '@/lib/types/contracts';

interface TaskRow {
    id: number | string;
    title?: string | null;
    description?: string | null;
    status?: string | null;
    priority?: string | null;
    due_date?: string | null;
    assigned_to?: string | null;
    assigned_user_name?: string | null;
    related_member_id?: string | null;
    related_member_name?: string | null;
    related_project_id?: number | string | null;
    related_project_name?: string | null;
    related_volunteer_app_id?: number | string | null;
    remarks?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    completed_at?: string | null;
}

interface TaskDetailRpc {
    task?: TaskRow | null;
}

export async function fetchTasksPage(filters: TasksListParams = {}): Promise<PaginatedResponse<Task>> {
    const response = await invokeRpcList<TaskRow>('rpc_get_tasks', {
        p_status: filters.status || null,
        p_assigned_to: filters.assignedTo || null,
        p_priority: filters.priority || null,
        p_related_member_id: filters.relatedMemberId || null,
        p_related_project_id: filters.relatedProjectId || null,
        p_related_volunteer_app_id: filters.relatedVolunteerAppId || null,
        p_limit: filters.limit ?? 20,
        p_offset: filters.offset ?? 0,
    });

    return {
        ...response,
        data: response.data.map((task) => ({
            id: String(task.id ?? ''),
            title: task.title || '',
            description: task.description || '',
            status: (task.status || 'pending') as Task['status'],
            priority: (task.priority || 'medium') as Task['priority'],
            dueDate: task.due_date ? new Date(task.due_date) : undefined,
            assignedTo: task.assigned_to || undefined,
            assignedToName: task.assigned_user_name || 'Internal User',
            relatedMemberId: task.related_member_id || undefined,
            relatedMemberName: task.related_member_name || undefined,
            relatedProjectId: task.related_project_id ? String(task.related_project_id) : undefined,
            relatedProjectName: task.related_project_name || undefined,
            relatedVolunteerAppId: task.related_volunteer_app_id ? String(task.related_volunteer_app_id) : undefined,
            remarks: task.remarks || undefined,
            createdAt: new Date(task.created_at || new Date()),
            updatedAt: new Date(task.updated_at || new Date()),
            completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
        })),
    };
}

export async function fetchTasks(filters?: TasksListParams): Promise<Task[]> {
    const page = await fetchTasksPage(filters);
    return page.data;
}

export async function fetchTaskById(id: string): Promise<Task | null> {
    const data = await invokeRpc<TaskDetailRpc>('rpc_get_task_detail', { p_task_id: Number(id) });
    return data?.task ? {
        id: String(data.task.id ?? ''),
        title: data.task.title || '',
        description: data.task.description || '',
        status: (data.task.status || 'pending') as Task['status'],
        priority: (data.task.priority || 'medium') as Task['priority'],
        dueDate: data.task.due_date ? new Date(data.task.due_date) : undefined,
        assignedTo: data.task.assigned_to || undefined,
        assignedToName: data.task.assigned_user_name || 'Internal User',
        relatedMemberId: data.task.related_member_id || undefined,
        relatedMemberName: data.task.related_member_name || undefined,
        relatedProjectId: data.task.related_project_id ? String(data.task.related_project_id) : undefined,
        relatedProjectName: data.task.related_project_name || undefined,
        relatedVolunteerAppId: data.task.related_volunteer_app_id ? String(data.task.related_volunteer_app_id) : undefined,
        remarks: data.task.remarks || undefined,
        createdAt: new Date(data.task.created_at || new Date()),
        updatedAt: new Date(data.task.updated_at || new Date()),
        completedAt: data.task.completed_at ? new Date(data.task.completed_at) : undefined,
    } : null;
}

export async function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return invokeFunction<Task, TaskWriteInput>('fn_upsert_task', {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate?.toISOString() ?? null,
        assignedTo: data.assignedTo ?? null,
        relatedMemberId: data.relatedMemberId ?? null,
        relatedProjectId: data.relatedProjectId ?? null,
        relatedVolunteerAppId: data.relatedVolunteerAppId ?? null,
        remarks: data.remarks,
    });
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return invokeFunction<Task, TaskWriteInput>('fn_upsert_task', {
        taskId: id,
        title: data.title ?? '',
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate?.toISOString() ?? null,
        assignedTo: data.assignedTo ?? null,
        relatedMemberId: data.relatedMemberId ?? null,
        relatedProjectId: data.relatedProjectId ?? null,
        relatedVolunteerAppId: data.relatedVolunteerAppId ?? null,
        remarks: data.remarks,
    });
}

export async function fetchTasksByMember(memberId: string): Promise<Task[]> {
    return fetchTasks({ relatedMemberId: memberId, limit: 50, offset: 0 });
}

export async function fetchTasksByProject(projectId: string): Promise<Task[]> {
    return fetchTasks({ relatedProjectId: projectId, limit: 50, offset: 0 });
}

export async function fetchTasksByVolunteerApp(appId: string): Promise<Task[]> {
    return fetchTasks({ relatedVolunteerAppId: appId, limit: 50, offset: 0 });
}
