-- ============================================================
-- AMP CRM - LIVE INTERNAL USER KPI CALCULATION
-- ============================================================
-- Replaces the stored-summary KPI RPC with a live aggregation
-- sourced from tasks and member onboarding assignments.
-- ============================================================

BEGIN;

create or replace function public.rpc_get_internal_user_kpis(
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  with role_rows as (
    select distinct
      ur.user_id
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where r.code in ('super_admin', 'manager', 'team_member')
  ),
  internal_users as (
    select
      rr.user_id,
      coalesce(
        nullif(trim(concat_ws(' ',
          au.raw_user_meta_data ->> 'first_name',
          au.raw_user_meta_data ->> 'last_name'
        )), ''),
        au.raw_user_meta_data ->> 'full_name',
        au.email,
        rr.user_id::text
      ) as team_member
    from role_rows rr
    left join auth.users au on au.id = rr.user_id
  ),
  task_stats as (
    select
      t.assigned_to as user_id,
      count(*) filter (where t.status = 'completed')::integer as tasks_completed,
      avg(
        extract(epoch from (t.completed_at - t.created_at)) / 3600.0
      ) filter (where t.status = 'completed' and t.completed_at is not null) as avg_response_time
    from public.tasks t
    where t.assigned_to is not null
    group by t.assigned_to
  ),
  onboarding_stats as (
    select
      ms.assigned_team_user_id as user_id,
      count(*)::integer as members_onboarded
    from public.member_status ms
    join public.members m on m.id = ms.member_id
    where ms.assigned_team_user_id is not null
      and coalesce(ms.status, case when m.is_active then 'active' else 'inactive' end) = 'active'
    group by ms.assigned_team_user_id
  ),
  grouped as (
    select
      u.team_member,
      coalesce(t.tasks_completed, 0) as tasks_completed,
      coalesce(o.members_onboarded, 0) as members_onboarded,
      coalesce(round(coalesce(t.avg_response_time, 0)::numeric, 1), 0)::numeric as avg_response_time
    from internal_users u
    left join task_stats t on t.user_id = u.user_id
    left join onboarding_stats o on o.user_id = u.user_id
  ),
  paged as (
    select * from grouped
    order by team_member
    limit p_limit offset p_offset
  )
  select public.rpc_json_list_response(
    coalesce((select jsonb_agg(to_jsonb(paged)) from paged), '[]'::jsonb),
    (select count(*) from grouped),
    p_limit,
    p_offset
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.rpc_get_internal_user_kpis(integer, integer) to anon, authenticated, service_role;

commit;
