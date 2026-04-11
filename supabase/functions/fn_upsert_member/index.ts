import { corsHeaders } from '../_shared/cors.ts';
import { createRequestServiceClient, createServiceClient } from '../_shared/client.ts';
import { getSiteUrl, sendWelcomeEmail } from '../_shared/email.ts';
import { json } from '../_shared/json.ts';
import type { MemberPayload } from '../_shared/types.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as MemberPayload;
    const supabase = createServiceClient();
    const actorClient = createRequestServiceClient(request);
    const {
      data: { user: actorUser },
    } = await actorClient.auth.getUser();
    const actorUserId = actorUser?.id ?? null;
    const fullName = `${payload.firstName ?? ''} ${payload.lastName ?? ''}`.trim();

    if (!fullName) {
      return json({ error: 'firstName and lastName are required' }, { status: 400 });
    }

    let memberId = payload.memberId;
    let existingMember: Record<string, unknown> | null = null;
    let previousStatus: string | null = null;

    if (memberId) {
      const { data, error } = await supabase.from('members').select('*').eq('id', memberId).single();
      if (error) throw error;
      existingMember = data;
    } else if (payload.email) {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .ilike('email', payload.email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data?.length) {
        existingMember = data[0];
        memberId = String(data[0].id);
      }
    }

    if (memberId) {
      const { data: statusRow, error: statusRowError } = await supabase
        .from('member_status')
        .select('status')
        .eq('member_id', memberId)
        .maybeSingle();

      if (statusRowError) throw statusRowError;
      previousStatus = typeof statusRow?.status === 'string' ? statusRow.status : null;
    }

    const resolvedFirstName = payload.firstName || String(existingMember?.first_name ?? '');
    const resolvedLastName = payload.lastName || String(existingMember?.last_name ?? '');
    const resolvedFullName = `${resolvedFirstName} ${resolvedLastName}`.trim() || fullName;
    const previousEmail = typeof existingMember?.email === 'string' ? existingMember.email : null;

    if (memberId) {
      const { error } = await supabase
        .from('members')
        .update({
          full_name: resolvedFullName,
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
          email: payload.email ?? existingMember?.email ?? null,
          phone: payload.phone ?? existingMember?.phone ?? null,
          city: payload.city ?? existingMember?.city ?? null,
          state: payload.state ?? existingMember?.state ?? null,
          is_active: payload.status !== 'inactive',
        })
        .eq('id', memberId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('members')
        .insert({
          full_name: resolvedFullName,
          first_name: resolvedFirstName,
          last_name: resolvedLastName,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          city: payload.city ?? null,
          state: payload.state ?? null,
          country: 'India',
          is_active: payload.status !== 'inactive',
        })
        .select('id')
        .single();

      if (error) throw error;
      memberId = data.id;
    }

    const shouldSendWelcome = Boolean(payload.email) && (!existingMember || !previousEmail);
    if (shouldSendWelcome && payload.email) {
      await sendWelcomeEmail({
        to: payload.email,
        name: resolvedFullName,
        loginUrl: new URL('/auth/login', getSiteUrl(request)).toString(),
      });
    }

    const { data: statusRow } = await supabase
      .from('member_status')
      .select('member_id')
      .eq('member_id', memberId)
      .maybeSingle();

    if (statusRow) {
      const { error } = await supabase
        .from('member_status')
        .update({ status: payload.status ?? 'active' })
        .eq('member_id', memberId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('member_status')
        .insert({ member_id: memberId, status: payload.status ?? 'active' });

        if (error) throw error;
      }

    const nextStatus = payload.status ?? 'active';
    const shouldRecordOnboarding = nextStatus === 'active' && previousStatus !== 'active';

    if (shouldRecordOnboarding) {
      const { data: onboardingEvent, error: onboardingLookupError } = await supabase
        .from('member_onboarding_events')
        .select('id')
        .eq('member_id', memberId)
        .eq('event_type', 'member_onboarded')
        .maybeSingle();

      if (onboardingLookupError) throw onboardingLookupError;

      if (!onboardingEvent) {
        const { error: onboardingInsertError } = await supabase
          .from('member_onboarding_events')
          .insert({
            member_id: memberId,
            event_type: 'member_onboarded',
            assigned_team_user_id: actorUserId,
          });

        if (onboardingInsertError) throw onboardingInsertError;
      }
    }

    const { data: scoreRow } = await supabase
      .from('member_scores')
      .select('member_id')
      .eq('member_id', memberId)
      .maybeSingle();

    if (!scoreRow) {
      const { error } = await supabase
        .from('member_scores')
        .insert({ member_id: memberId, total_score: 0 });

      if (error) throw error;
    }

    const { data: member, error: memberError } = await supabase.rpc('rpc_get_member_detail', {
      p_member_id: memberId,
    });

    if (memberError) throw memberError;

    return json({
      id: member.member.id,
      ampId: member.member.amp_id,
      name: member.member.full_name,
      firstName: member.member.first_name ?? '',
      lastName: member.member.last_name ?? '',
      email: member.member.email ?? '',
      phone: member.member.phone ?? '',
      city: member.member.city ?? '',
      state: member.member.state ?? '',
      status: member.status?.status ?? 'active',
      type: 'member',
      score: member.score?.total_score ?? 0,
      joinedAt: member.member.created_at,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
