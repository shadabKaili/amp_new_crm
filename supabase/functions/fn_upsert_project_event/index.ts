import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/client.ts';
import { json } from '../_shared/json.ts';
import type { ProjectEventWriteInput } from '../_shared/types.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as ProjectEventWriteInput;
    const supabase = createServiceClient();

    if (!payload.projectId || !payload.title || !payload.eventDate) {
      return json({ error: 'projectId, title, and eventDate are required' }, { status: 400 });
    }

    const writePayload = {
      project_id: Number(payload.projectId),
      title: payload.title,
      description: payload.description ?? null,
      event_type: payload.eventType,
      event_date: payload.eventDate,
      score_value: payload.scoreValue ?? 0,
      status: payload.status ?? 'upcoming',
    };

    let eventId = payload.eventId ? Number(payload.eventId) : undefined;

    if (eventId) {
      const { error } = await supabase.from('project_events').update(writePayload).eq('id', eventId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('project_events').insert(writePayload).select('id').single();
      if (error) throw error;
      eventId = data.id;
    }

    const { data, error } = await supabase
      .from('project_events')
      .select('id, project_id, title, description, event_type, event_date, score_value, status')
      .eq('id', eventId)
      .single();

    if (error) throw error;

    return json({
      id: String(data.id),
      projectId: String(data.project_id),
      title: data.title,
      description: data.description ?? undefined,
      eventType: data.event_type,
      eventDate: data.event_date,
      scoreValue: data.score_value ?? 0,
      status: data.status,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
