import { createClient } from 'npm:@supabase/supabase-js@2';

export function createServiceClient(extraHeaders: HeadersInit = {}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: extraHeaders,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createRequestServiceClient(request: Request) {
  const authorization = request.headers.get('Authorization');

  return createServiceClient(
    authorization ? { Authorization: authorization } : {},
  );
}
