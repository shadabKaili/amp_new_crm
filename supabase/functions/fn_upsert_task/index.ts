import { corsHeaders } from '../_shared/cors.ts';
import { createRequestServiceClient, createServiceClient } from '../_shared/client.ts';
import { sendTaskAssignmentEmail } from '../_shared/email.ts';
import { json } from '../_shared/json.ts';
import type { TaskPayload } from '../_shared/types.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as TaskPayload;
    const supabase = createServiceClient();
    const actorClient = createRequestServiceClient(request);
    const {
      data: { user: actorUser },
    } = await actorClient.auth.getUser();
    const actorUserId = actorUser?.id ?? null;

    if (!payload.taskId && !payload.title) {
      return json({ error: 'title is required' }, { status: 400 });
    }

    let taskId = payload.taskId ? Number(payload.taskId) : undefined;
    let existingTask: Record<string, unknown> | null = null;

    if (taskId) {
      const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (error) throw error;
      existingTask = data;
    }

    const writePayload = {
      title: payload.title || String(existingTask?.title ?? ''),
      description: payload.description ?? existingTask?.description ?? null,
      status: payload.status ?? existingTask?.status ?? 'pending',
      priority: payload.priority ?? existingTask?.priority ?? 'medium',
      due_date: payload.dueDate ?? existingTask?.due_date ?? null,
      assigned_to: payload.assignedTo ?? existingTask?.assigned_to ?? null,
      related_member_id: payload.relatedMemberId ?? existingTask?.related_member_id ?? null,
      related_project_id: payload.relatedProjectId ? Number(payload.relatedProjectId) : existingTask?.related_project_id ?? null,
      related_volunteer_app_id: payload.relatedVolunteerAppId ? Number(payload.relatedVolunteerAppId) : existingTask?.related_volunteer_app_id ?? null,
      remarks: payload.remarks ?? existingTask?.remarks ?? null,
    };

    const previousAssignee = existingTask?.assigned_to ? String(existingTask.assigned_to) : null;
    const previousStatus = typeof existingTask?.status === 'string' ? String(existingTask.status) : null;

    if (taskId) {
      const { error } = await supabase.from('tasks').update(writePayload).eq('id', taskId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('tasks').insert(writePayload).select('id').single();
      if (error) throw error;
      taskId = data.id;
    }

    const nextStatus = writePayload.status;
    const shouldRecordCompletion = nextStatus === 'completed' && previousStatus !== 'completed';

    if (shouldRecordCompletion) {
      const { data: completionEvent, error: completionLookupError } = await supabase
        .from('task_completion_events')
        .select('id')
        .eq('task_id', taskId)
        .maybeSingle();

      if (completionLookupError) throw completionLookupError;

      if (!completionEvent) {
        const { error: completionInsertError } = await supabase
          .from('task_completion_events')
          .insert({
            task_id: taskId,
            completed_by_user_id: actorUserId,
            assigned_to_user_id: writePayload.assigned_to ?? previousAssignee,
          });

        if (completionInsertError) throw completionInsertError;
      }
    }

    const assigneeChanged = Boolean(writePayload.assigned_to) && writePayload.assigned_to !== previousAssignee;
    if (assigneeChanged) {
      const { data: assignee } = await supabase
        .from('members')
        .select('full_name, email')
        .eq('id', writePayload.assigned_to)
        .single();

      if (assignee?.email) {
        await sendTaskAssignmentEmail({
          to: assignee.email,
          name: assignee.full_name ?? 'Team member',
          taskTitle: writePayload.title,
          taskStatus: writePayload.status,
        });
      }
    }

    const { data, error } = await supabase.rpc('rpc_get_task_detail', { p_task_id: taskId });
    if (error) throw error;
    return json(data.task);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
