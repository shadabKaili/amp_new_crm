import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/client.ts';
import { json } from '../_shared/json.ts';
import type { ProjectActivitySubmissionInput } from '../_shared/types.ts';

function mapActivityType(eventType: string, activityType?: string) {
  if (activityType) return activityType;

  switch (eventType) {
    case 'webinar':
      return 'webinar_attendance';
    case 'meeting':
      return 'meeting_attendance';
    case 'workshop':
      return 'participated_in_workshop';
    default:
      return 'event_attendance';
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as ProjectActivitySubmissionInput;
    const supabase = createServiceClient();

    if (!payload.projectId || !payload.projectEventId || !payload.memberId) {
      return json({ error: 'projectId, projectEventId, and memberId are required' }, { status: 400 });
    }

    const projectId = Number(payload.projectId);
    const eventId = Number(payload.projectEventId);

    const { data: event, error: eventError } = await supabase
      .from('project_events')
      .select('id, project_id, title, event_type, event_date, score_value, status')
      .eq('id', eventId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) {
      return json({ error: 'Project event not found.' }, { status: 404 });
    }

    if (event.status === 'cancelled') {
      return json({ error: 'Cancelled events cannot be submitted.' }, { status: 400 });
    }

    const { data: participant } = await supabase
      .from('project_members')
      .select('project_id, member_id')
      .eq('project_id', projectId)
      .eq('member_id', payload.memberId)
      .maybeSingle();

    const { data: requestRow } = await supabase
      .from('project_participation_requests')
      .select('status')
      .eq('project_id', projectId)
      .eq('member_id', payload.memberId)
      .eq('status', 'approved')
      .maybeSingle();

    if (!participant && !requestRow) {
      return json({ error: 'Request participation or wait for approval before submitting activity.' }, { status: 403 });
    }

    const activityType = mapActivityType(String(event.event_type), payload.activityType);
    const scoreAwarded = payload.scoreAwarded ?? Number(event.score_value ?? 0);

    const { data: existingSubmission } = await supabase
      .from('project_activity_submissions')
      .select('id, project_id, project_event_id, member_id, activity_type, notes, score_awarded, status, submitted_at, reviewed_at, reviewed_by')
      .eq('project_event_id', eventId)
      .eq('member_id', payload.memberId)
      .maybeSingle();

    if (existingSubmission) {
      const { data: member } = await supabase.from('members').select('full_name').eq('id', payload.memberId).single();
      return json({
        id: String(existingSubmission.id),
        projectId: String(existingSubmission.project_id),
        projectEventId: String(existingSubmission.project_event_id),
        memberId: String(existingSubmission.member_id),
        memberName: member?.full_name ?? 'Unknown',
        eventTitle: event.title,
        eventType: event.event_type,
        activityType: existingSubmission.activity_type,
        notes: existingSubmission.notes ?? undefined,
        scoreAwarded: Number(existingSubmission.score_awarded ?? 0),
        status: existingSubmission.status,
        submittedAt: existingSubmission.submitted_at,
        reviewedAt: existingSubmission.reviewed_at ?? undefined,
        reviewedBy: existingSubmission.reviewed_by ?? undefined,
      });
    }

    const { data: typeRow, error: typeError } = await supabase
      .from('activity_types')
      .select('id')
      .eq('code', activityType)
      .maybeSingle();

    if (typeError) throw typeError;

    if (!typeRow) {
      return json({ error: `Missing activity type: ${activityType}` }, { status: 500 });
    }

    const submissionPayload = {
      project_id: projectId,
      project_event_id: eventId,
      member_id: payload.memberId,
      activity_type: activityType,
      notes: payload.notes ?? null,
      score_awarded: scoreAwarded,
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'edge_function',
    };

    const { data: submission, error: submissionError } = await supabase
      .from('project_activity_submissions')
      .insert(submissionPayload)
      .select('id, project_id, project_event_id, member_id, activity_type, notes, score_awarded, status, submitted_at, reviewed_at, reviewed_by')
      .single();

    if (submissionError) throw submissionError;

    const { error: activityError } = await supabase.from('member_activities').insert({
      member_id: payload.memberId,
      activity_type_id: typeRow.id,
      score_earned: scoreAwarded,
      metadata: {
        projectId,
        projectEventId: eventId,
        projectName: null,
        projectEventTitle: event.title,
        eventType: event.event_type,
        activityType,
        notes: payload.notes ?? null,
      },
    });

    if (activityError) throw activityError;

    const { data: member } = await supabase.from('members').select('full_name').eq('id', payload.memberId).single();

    return json({
      id: String(submission.id),
      projectId: String(submission.project_id),
      projectEventId: String(submission.project_event_id),
      memberId: String(submission.member_id),
      memberName: member?.full_name ?? 'Unknown',
      eventTitle: event.title,
      eventType: event.event_type,
      activityType: submission.activity_type,
      notes: submission.notes ?? undefined,
      scoreAwarded: Number(submission.score_awarded ?? 0),
      status: submission.status,
      submittedAt: submission.submitted_at,
      reviewedAt: submission.reviewed_at ?? undefined,
      reviewedBy: submission.reviewed_by ?? undefined,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
