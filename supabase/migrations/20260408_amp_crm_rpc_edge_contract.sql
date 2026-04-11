-- ============================================================
-- AMP CRM - RPC + Edge Function Contract Scaffold
-- Date: 2026-04-08
-- ============================================================
-- This migration documents and standardizes the frontend-facing
-- contract for RPC reads and Edge Function writes.
--
-- Important:
-- 1. Read flows should return JSON envelopes compatible with
--    { data, total, limit, offset } where appropriate.
-- 2. Activity reads must require bounded dates for partition pruning.
-- 3. Write flows are expected to be implemented in Edge Functions.
-- ============================================================

begin;

create or replace function public.rpc_json_list_response(
  p_data jsonb,
  p_total integer,
  p_limit integer,
  p_offset integer
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'data', coalesce(p_data, '[]'::jsonb),
    'total', coalesce(p_total, 0),
    'limit', coalesce(p_limit, 0),
    'offset', coalesce(p_offset, 0)
  );
$$;

comment on function public.rpc_json_list_response(jsonb, integer, integer, integer)
is 'Helper to normalize RPC list responses for the frontend.';

-- ============================================================
-- Activity query guardrail
-- ============================================================
create or replace function public.assert_bounded_activity_range(
  p_from timestamptz,
  p_to timestamptz
)
returns void
language plpgsql
as $$
begin
  if p_from is null or p_to is null then
    raise exception 'Activity queries require both p_from and p_to';
  end if;

  if p_to < p_from then
    raise exception 'Activity date range is invalid';
  end if;
end;
$$;

comment on function public.assert_bounded_activity_range(timestamptz, timestamptz)
is 'Guardrail used by activity RPCs to enforce partition-friendly bounded reads.';

-- ============================================================
-- Placeholder contract notes
-- ============================================================
-- Expected RPC names:
-- rpc_get_dashboard_stats
-- rpc_get_recent_activity
-- rpc_get_members
-- rpc_get_member_detail
-- rpc_get_member_dashboard
-- rpc_get_tasks
-- rpc_get_task_detail
-- rpc_get_projects
-- rpc_get_project_detail
-- rpc_get_project_events
-- rpc_get_project_participation_requests
-- rpc_get_project_activity_submissions
-- rpc_get_project_member_state
-- rpc_get_donations
-- rpc_get_referrals
-- rpc_get_volunteer_applications
-- rpc_get_internal_user_kpis
--
-- Expected Edge Function names:
-- fn_upsert_member
-- fn_upsert_task
-- fn_upsert_project
-- fn_upsert_project_event
-- fn_request_project_participation
-- fn_submit_project_activity
-- fn_create_donation
-- fn_upsert_referral
-- fn_upsert_volunteer_application

commit;
