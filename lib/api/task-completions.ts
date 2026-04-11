import { invokeRpcList } from '@/lib/supabase/rpc';

export interface TaskCompletionEventRow {
    id: string;
    task_id: string;
    task_title?: string | null;
    task_status?: string | null;
    task_priority?: string | null;
    completed_by_user_id?: string | null;
    completed_by_name?: string | null;
    assigned_to_user_id?: string | null;
    notes?: string | null;
    created_at?: string | null;
}

export async function fetchTaskCompletionEvents(limit = 50, offset = 0) {
    return invokeRpcList<TaskCompletionEventRow>('rpc_get_task_completion_events', {
        p_limit: limit,
        p_offset: offset,
    });
}
