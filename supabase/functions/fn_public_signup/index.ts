import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/client.ts';
import { getSiteUrl, sendWelcomeEmail } from '../_shared/email.ts';
import { json } from '../_shared/json.ts';
import type { PublicSignupPayload } from '../_shared/types.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as PublicSignupPayload;
    const supabase = createServiceClient();
    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;

    if (!firstName || !lastName || !email || !password) {
      return json({ error: 'firstName, lastName, email, and password are required' }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) throw usersError;

    const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === email);
    if (existingUser) {
      return json({ error: 'An account already exists for this email.' }, { status: 409 });
    }

    const { data: authUserData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        avatar_url: payload.avatarUrl ?? null,
        must_change_password: false,
      },
    });

    if (createUserError) throw createUserError;

    const { data: existingMembers, error: existingMembersError } = await supabase
      .from('members')
      .select('id')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingMembersError) throw existingMembersError;

    let memberId: string;

    if (existingMembers?.length) {
      memberId = String(existingMembers[0].id);

      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          email,
          is_active: true,
        })
        .eq('id', memberId);

      if (memberUpdateError) throw memberUpdateError;
    } else {
      const { data: memberData, error: memberInsertError } = await supabase
        .from('members')
        .insert({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          email,
          country: 'India',
          is_active: true,
        })
        .select('id')
        .single();

      if (memberInsertError) throw memberInsertError;
      memberId = String(memberData.id);
    }

    const { error: statusError } = await supabase
      .from('member_status')
      .upsert({ member_id: memberId, status: 'active' }, { onConflict: 'member_id' });

    if (statusError) throw statusError;

    const { error: scoreError } = await supabase
      .from('member_scores')
      .upsert({ member_id: memberId, total_score: 0 }, { onConflict: 'member_id' });

    if (scoreError) throw scoreError;

    const loginUrl = new URL('/auth/login', getSiteUrl(request)).toString();
    await sendWelcomeEmail({
      to: email,
      name: fullName,
      loginUrl,
    });

    return json({
      id: authUserData.user?.id,
      email,
      memberId,
      name: fullName,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
