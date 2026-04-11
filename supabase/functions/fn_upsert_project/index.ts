import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/client.ts';
import { json } from '../_shared/json.ts';
import type { ProjectPayload } from '../_shared/types.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as ProjectPayload;
    const supabase = createServiceClient();

    if (!payload.name) {
      return json({ error: 'name is required' }, { status: 400 });
    }

    const writePayload = {
      name: payload.name,
      description: payload.description ?? '',
      type: payload.type ?? 'community',
      status: payload.status ?? 'planning',
      start_date: payload.startDate ?? null,
      end_date: payload.endDate ?? null,
    };

    let projectId = payload.projectId ? Number(payload.projectId) : undefined;

    if (projectId) {
      const { error } = await supabase.from('projects').update(writePayload).eq('id', projectId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('projects').insert(writePayload).select('id').single();
      if (error) throw error;
      projectId = data.id;
    }

    const { data, error } = await supabase.rpc('rpc_get_project_detail', { p_project_id: projectId });
    if (error) throw error;

    return json({
      id: String(data.project.id),
      name: data.project.name,
      description: data.project.description ?? '',
      status: data.project.status,
      type: data.project.type,
      startDate: data.project.start_date,
      endDate: data.project.end_date,
      membersCount: data.project.members_count ?? 0,
      volunteersCount: data.project.volunteers_count ?? 0,
      tasksCount: data.project.tasks_count ?? 0,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
