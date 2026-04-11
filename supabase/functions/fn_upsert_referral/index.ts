import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/client.ts';
import { getSiteUrl, sendReferralApprovedEmail, sendReferralEmail } from '../_shared/email.ts';
import { json } from '../_shared/json.ts';
import type { ReferralPayload } from '../_shared/types.ts';

const REFERRAL_POINTS = 150;
const DEFAULT_NEW_MEMBER_PASSWORD = 'Abc@123';

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? 'Member',
    lastName: parts.slice(1).join(' '),
  };
}

async function ensureReferredMemberAndAuth(
  supabase: ReturnType<typeof createServiceClient>,
  referredName: string,
  referredEmail: string | null,
  siteUrl: string,
): Promise<string> {
  const { firstName, lastName } = splitFullName(referredName);
  let referredMemberId: string | null = null;

  if (referredEmail) {
    const { data: existingMembers, error: existingMembersError } = await supabase
      .from('members')
      .select('id')
      .ilike('email', referredEmail)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingMembersError) throw existingMembersError;

    if (existingMembers?.length) {
      referredMemberId = String(existingMembers[0].id);

      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({
          full_name: referredName,
          first_name: firstName,
          last_name: lastName || null,
          email: referredEmail,
          is_active: true,
        })
        .eq('id', referredMemberId);

      if (memberUpdateError) throw memberUpdateError;
    } else {
      const { data: createdMember, error: memberInsertError } = await supabase
        .from('members')
        .insert({
          full_name: referredName,
          first_name: firstName,
          last_name: lastName || null,
          email: referredEmail,
          country: 'India',
          is_active: true,
        })
        .select('id')
        .single();

      if (memberInsertError) throw memberInsertError;
      referredMemberId = String(createdMember.id);
    }
  } else {
    const { data: createdMember, error: memberInsertError } = await supabase
      .from('members')
      .insert({
        full_name: referredName,
        first_name: firstName,
        last_name: lastName || null,
        email: null,
        country: 'India',
        is_active: true,
      })
      .select('id')
      .single();

    if (memberInsertError) throw memberInsertError;
    referredMemberId = String(createdMember.id);
  }

  if (referredMemberId) {
    const { error: statusError } = await supabase
      .from('member_status')
      .upsert({ member_id: referredMemberId, status: 'active' }, { onConflict: 'member_id' });

    if (statusError) throw statusError;

    const { error: scoreError } = await supabase
      .from('member_scores')
      .upsert({ member_id: referredMemberId, total_score: 0 }, { onConflict: 'member_id' });

    if (scoreError) throw scoreError;
  }

  if (!referredEmail) {
    return String(referredMemberId);
  }

  const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) throw usersError;

  const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === referredEmail.toLowerCase());

  if (existingUser) {
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        ...existingUser.user_metadata,
        full_name: referredName,
        must_change_password: true,
      },
    });

    if (updateUserError) throw updateUserError;
  } else {
    const { error: createUserError } = await supabase.auth.admin.createUser({
      email: referredEmail,
      password: DEFAULT_NEW_MEMBER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: referredName,
        must_change_password: true,
      },
    });

    if (createUserError) throw createUserError;
  }

  const { data: recoveryLink, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: referredEmail,
    options: {
      redirectTo: new URL('/auth/reset-password', siteUrl).toString(),
    },
  });

  if (linkError) throw linkError;

  await sendReferralApprovedEmail({
    to: referredEmail,
    name: referredName,
    loginUrl: recoveryLink.properties.action_link,
  });

  return String(referredMemberId);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as ReferralPayload;
    const supabase = createServiceClient();
    const siteUrl = getSiteUrl(request);

    let referralId = payload.referralId ? Number(payload.referralId) : undefined;
    let existingReferral: Record<string, unknown> | null = null;

    if (referralId) {
      const { data, error } = await supabase.from('member_referrals').select('*').eq('id', referralId).single();
      if (error) throw error;
      existingReferral = data;
    }

    const writePayload = {
      referrer_member_id: payload.referrerId,
      referred_name: payload.referredName,
      referred_email: payload.referredEmail ?? null,
      referred_phone: payload.referredPhone ?? null,
      status: payload.status ?? 'pending',
    };

    if (referralId) {
      const { error } = await supabase.from('member_referrals').update(writePayload).eq('id', referralId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('member_referrals').insert(writePayload).select('id').single();
      if (error) throw error;
      referralId = data.id;
    }

    const { data, error } = await supabase
      .from('member_referrals')
      .select('id, referrer_member_id, referred_name, referred_email, referred_phone, status, joined_member_id, created_at, updated_at')
      .eq('id', referralId)
      .single();

    if (error) throw error;

    const { data: referrer } = await supabase.from('members').select('full_name').eq('id', data.referrer_member_id).single();
    const previousStatus = typeof existingReferral?.status === 'string' ? existingReferral.status : null;
    const statusChanged = previousStatus !== data.status;

    if (statusChanged) {
      const { data: referrerContact } = await supabase
        .from('members')
        .select('full_name, email')
        .eq('id', data.referrer_member_id)
        .single();

      if (referrerContact?.email) {
        await sendReferralEmail({
          to: referrerContact.email,
          name: referrerContact.full_name ?? referrer?.full_name ?? 'Supporter',
          referredName: data.referred_name,
          status: data.status,
        });
      }

      const wasApproved = previousStatus === 'approved';
      const isApproved = data.status === 'approved';

      if (wasApproved !== isApproved) {
        const { data: currentScore } = await supabase
          .from('member_scores')
          .select('member_id, total_score')
          .eq('member_id', data.referrer_member_id)
          .maybeSingle();

        const nextScore = Math.max(Number(currentScore?.total_score ?? 0) + (isApproved ? REFERRAL_POINTS : -REFERRAL_POINTS), 0);

        if (currentScore) {
          const { error: scoreUpdateError } = await supabase
            .from('member_scores')
            .update({ total_score: nextScore })
            .eq('member_id', data.referrer_member_id);

          if (scoreUpdateError) throw scoreUpdateError;
        } else if (isApproved) {
          const { error: scoreInsertError } = await supabase
            .from('member_scores')
            .insert({ member_id: data.referrer_member_id, total_score: REFERRAL_POINTS });

          if (scoreInsertError) throw scoreInsertError;
        }
      }

      if (previousStatus !== 'approved' && data.status === 'approved') {
        const joinedMemberId = await ensureReferredMemberAndAuth(supabase, data.referred_name, data.referred_email, siteUrl);

        const { error: referralLinkError } = await supabase
          .from('member_referrals')
          .update({ joined_member_id: joinedMemberId })
          .eq('id', data.id);

        if (referralLinkError) throw referralLinkError;
      }
    }

    return json({
      id: String(data.id),
      referrerId: data.referrer_member_id,
      referrerName: referrer?.full_name ?? 'Unknown',
      referredName: data.referred_name,
      referredEmail: data.referred_email ?? '',
      referredPhone: data.referred_phone ?? '',
      status: data.status,
      pointsEarned: data.status === 'approved' ? REFERRAL_POINTS : 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at ?? data.created_at,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
