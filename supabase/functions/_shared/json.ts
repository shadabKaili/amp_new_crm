import { corsHeaders } from './cors.ts';

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

export function notImplemented(functionName: string) {
  return json(
    {
      error: `${functionName} is scaffolded in the repo but still needs project-specific Supabase service-role logic before deployment.`,
    },
    { status: 501 },
  );
}
