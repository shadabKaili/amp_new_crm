import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/client.ts';
import { getSiteUrl, sendOnboardingReminderEmail, sendVolunteerReadyEmail, sendVolunteerRejectedEmail } from '../_shared/email.ts';
import { json } from '../_shared/json.ts';
import type { VolunteerPayload } from '../_shared/types.ts';

const DEFAULT_VOLUNTEER_PASSWORD = 'Abc@123';

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? 'Volunteer',
    lastName: parts.slice(1).join(' '),
  };
}

async function ensureMemberRecord(
  supabase: ReturnType<typeof createServiceClient>,
  payload: VolunteerPayload,
) {
  if (!payload.email) return;

  const { data: existingMembers, error: existingMembersError } = await supabase
    .from('members')
    .select('id')
    .ilike('email', payload.email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingMembersError) throw existingMembersError;

  if (existingMembers?.length) {
    return existingMembers[0].id;
  }

  const { firstName, lastName } = splitFullName(payload.name);
  const fullName = `${firstName} ${lastName}`.trim();

  const { data: createdMember, error: createdMemberError } = await supabase
    .from('members')
    .insert({
      full_name: fullName,
      first_name: firstName,
      last_name: lastName || null,
      email: payload.email,
      phone: payload.phone ?? null,
      country: 'India',
      is_active: true,
    })
    .select('id')
    .single();

  if (createdMemberError) throw createdMemberError;

  const memberId = createdMember.id;

  const { error: statusError } = await supabase
    .from('member_status')
    .upsert({ member_id: memberId, status: 'active' }, { onConflict: 'member_id' });

  if (statusError) throw statusError;

  const { error: scoreError } = await supabase
    .from('member_scores')
    .upsert({ member_id: memberId, total_score: 0 }, { onConflict: 'member_id' });

  if (scoreError) throw scoreError;

  return memberId;
}

async function ensureAuthAccount(
  supabase: ReturnType<typeof createServiceClient>,
  payload: VolunteerPayload,
) {
  if (!payload.email) return;

  const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) throw usersError;

  const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === payload.email?.toLowerCase());

  if (existingUser) {
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: DEFAULT_VOLUNTEER_PASSWORD,
      user_metadata: {
        ...existingUser.user_metadata,
        full_name: payload.name,
        must_change_password: true,
      },
    });

    if (updateUserError) throw updateUserError;
    return existingUser.id;
  }

  const { error: createUserError } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: DEFAULT_VOLUNTEER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: payload.name,
      must_change_password: true,
    },
  });

  if (createUserError) throw createUserError;
}

async function assignOnboardingTeamMember(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase.rpc('rpc_assign_next_onboarding_team_member');

  if (error) throw error;

  return (data as string | null | undefined) ?? null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as VolunteerPayload;
    const supabase = createServiceClient();
    let applicationId = payload.applicationId ? Number(payload.applicationId) : undefined;
    const isNewApplication = !applicationId;

    let referrerMemberId: string | null = null;
    if (payload.referralAmpId) {
      const { data: member } = await supabase.from('members').select('id').eq('amp_id', payload.referralAmpId).maybeSingle();
      referrerMemberId = member?.id ?? null;
    }

    let existingAssignedTeamUserId: string | null = null;
    if (applicationId) {
      const { data: existingApplication, error: existingApplicationError } = await supabase
        .from('volunteer_applications')
        .select('assigned_team_user_id')
        .eq('id', applicationId)
        .maybeSingle();

      if (existingApplicationError) throw existingApplicationError;
      existingAssignedTeamUserId = existingApplication?.assigned_team_user_id ?? null;
    }

    const assignedTeamUserId = existingAssignedTeamUserId
      ?? payload.assignedTeamUserId
      ?? (applicationId ? null : await assignOnboardingTeamMember(supabase));

    const writePayload = {
      full_name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      skills: (payload.skills ?? []).join(', '),
      availability: payload.availability ?? null,
      motivation: payload.motivation ?? null,
      referred_by_amp_id: payload.referralAmpId ?? null,
      referrer_member_id: referrerMemberId,
      assigned_team_user_id: assignedTeamUserId,
      status: payload.status ?? 'pending',
      notes: payload.notes ?? null,
      reviewed_at: payload.status && payload.status !== 'pending' ? new Date().toISOString() : null,
      reviewed_by: payload.status && payload.status !== 'pending' ? 'edge_function' : null,
    };

    if (applicationId) {
      const { error } = await supabase.from('volunteer_applications').update(writePayload).eq('id', applicationId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('volunteer_applications').insert(writePayload).select('id').single();
      if (error) throw error;
      applicationId = data.id;
    }

    if (payload.createFollowUpTask && applicationId) {
      const { error } = await supabase.from('tasks').insert({
        title: `Volunteer follow-up: ${payload.name}`,
        description: 'Follow up with approved volunteer application',
        status: 'pending',
        priority: 'medium',
        related_volunteer_app_id: applicationId,
      });

      if (error) throw error;
    }

    if (payload.status === 'approved') {
      await ensureMemberRecord(supabase, payload);
      await ensureAuthAccount(supabase, payload);

      if (payload.email) {
        const { data } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: payload.email,
          options: {
            redirectTo: new URL('/auth/reset-password', getSiteUrl(request)).toString(),
          },
        });

        await sendVolunteerReadyEmail({
          to: payload.email,
          name: payload.name,
          actionLink: data.properties.action_link,
        });
      }
    } else if (payload.status === 'rejected' && payload.email) {
      await sendVolunteerRejectedEmail({
        to: payload.email,
        name: payload.name,
      });
    }

    let assignedTeamMemberName: string | undefined;
    if (assignedTeamUserId && (isNewApplication || existingAssignedTeamUserId !== assignedTeamUserId)) {
      const { data: assignee, error: assigneeError } = await supabase.auth.admin.getUserById(assignedTeamUserId);

      if (assigneeError) throw assigneeError;

      const assigneeEmail = assignee.user?.email ?? null;
      const assigneeName = assignee.user?.user_metadata?.full_name
        ?? [assignee.user?.user_metadata?.first_name, assignee.user?.user_metadata?.last_name].filter(Boolean).join(' ')
        ?? assigneeEmail
        ?? 'Team member';
      assignedTeamMemberName = assigneeName;

      if (assigneeEmail) {
        await sendOnboardingReminderEmail({
          to: assigneeEmail,
          name: assigneeName,
          volunteerName: payload.name,
          volunteerEmail: payload.email ?? null,
          volunteerPhone: payload.phone ?? null,
          availability: payload.availability ?? null,
          motivation: payload.motivation ?? null,
          actionLink: new URL('/volunteer-applications', getSiteUrl(request)).toString(),
        });
      }
    }

    const { data, error } = await supabase
      .from('volunteer_applications')
      .select('id, full_name, email, phone, skills, availability, motivation, referred_by_amp_id, assigned_team_user_id, status, created_at, reviewed_at, reviewed_by, notes')
      .eq('id', applicationId)
      .single();

    if (error) throw error;

    return json({
      id: String(data.id),
      name: data.full_name,
      email: data.email ?? '',
      phone: data.phone ?? '',
      referralAmpId: data.referred_by_amp_id ?? undefined,
      assignedTeamUserId: data.assigned_team_user_id ?? undefined,
      assignedTeamMemberName,
      skills: data.skills ? String(data.skills).split(',').map((skill) => skill.trim()) : [],
      availability: data.availability ?? '',
      motivation: data.motivation ?? '',
      status: data.status,
      submittedAt: data.created_at,
      reviewedAt: data.reviewed_at ?? undefined,
      reviewedBy: data.reviewed_by ?? undefined,
      notes: data.notes ?? undefined,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
