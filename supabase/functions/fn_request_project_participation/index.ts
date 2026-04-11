import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/client.ts';
import { json } from '../_shared/json.ts';
import type { ProjectParticipationRequestInput } from '../_shared/types.ts';

async function upsertProjectMember(
  supabase: ReturnType<typeof createServiceClient>,
  projectId: number,
  memberId: string,
) {
  const { data: existingMember } = await supabase
    .from('project_members')
    .select('project_id, member_id')
    .eq('project_id', projectId)
    .eq('member_id', memberId)
    .maybeSingle();

  if (!existingMember) {
    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      member_id: memberId,
      role: 'participant',
    });

    if (error) throw error;
  }
}

async function removeProjectMember(
  supabase: ReturnType<typeof createServiceClient>,
  projectId: number,
  memberId: string,
) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('member_id', memberId);

  if (error) throw error;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as ProjectParticipationRequestInput;
    const supabase = createServiceClient();

    if (!payload.projectId || !payload.memberId) {
      return json({ error: 'projectId and memberId are required' }, { status: 400 });
    }

    const writePayload = {
      project_id: Number(payload.projectId),
      member_id: payload.memberId,
      note: payload.note ?? null,
      status: payload.status ?? 'pending',
    };

    let requestId = payload.requestId ? Number(payload.requestId) : undefined;

    if (requestId) {
      const { error } = await supabase.from('project_participation_requests').update(writePayload).eq('id', requestId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('project_participation_requests')
        .upsert(writePayload, { onConflict: 'project_id,member_id' })
        .select('id')
        .single();

      if (error) throw error;
      requestId = data.id;
    }

    if (writePayload.status === 'approved') {
      await upsertProjectMember(supabase, Number(payload.projectId), payload.memberId);
    }

    if (writePayload.status === 'rejected') {
      await removeProjectMember(supabase, Number(payload.projectId), payload.memberId);
    }

    const { data, error } = await supabase
      .from('project_participation_requests')
      .select('id, project_id, member_id, note, status, created_at, updated_at')
      .eq('id', requestId)
      .single();

    if (error) throw error;

    const { data: member } = await supabase.from('members').select('full_name, email').eq('id', data.member_id).single();

    return json({
      id: String(data.id),
      projectId: String(data.project_id),
      memberId: String(data.member_id),
      memberName: member?.full_name ?? 'Unknown',
      memberEmail: member?.email ?? undefined,
      note: data.note ?? undefined,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
