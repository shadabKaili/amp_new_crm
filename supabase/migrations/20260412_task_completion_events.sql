-- ============================================================
-- AMP CRM - TASK COMPLETION EVENTS
-- ============================================================
-- Tracks explicit task completion events so KPI counts and audits
-- can be traced to real completion records.
-- ============================================================

BEGIN;

create table if not exists public.task_completion_events (
  id bigserial primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  completed_by_user_id uuid references auth.users(id) on delete set null,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_task_completion_events_task_id
  on public.task_completion_events(task_id);
create index if not exists idx_task_completion_events_completed_by_user_id
  on public.task_completion_events(completed_by_user_id);
create index if not exists idx_task_completion_events_assigned_to_user_id
  on public.task_completion_events(assigned_to_user_id);
create index if not exists idx_task_completion_events_created_at
  on public.task_completion_events(created_at);

comment on table public.task_completion_events is 'Explicit task completion events recorded when a task is marked completed.';

insert into public.task_completion_events (
  task_id,
  completed_by_user_id,
  assigned_to_user_id,
  notes,
  created_at
)
select
  t.id,
  t.assigned_to,
  t.assigned_to,
  'Backfilled from completed tasks',
  coalesce(t.completed_at, now())
from public.tasks t
where t.status = 'completed'
on conflict (task_id) do nothing;

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
      tce.assigned_to_user_id as user_id,
      count(*)::integer as tasks_completed,
      avg(
        extract(epoch from (t.completed_at - t.created_at)) / 3600.0
      ) filter (where t.completed_at is not null) as avg_response_time
    from public.task_completion_events tce
    join public.tasks t on t.id = tce.task_id
    where tce.assigned_to_user_id is not null
    group by tce.assigned_to_user_id
  ),
  onboarding_stats as (
    select
      moe.assigned_team_user_id as user_id,
      count(*)::integer as members_onboarded
    from public.member_onboarding_events moe
    where moe.event_type = 'member_onboarded'
      and moe.assigned_team_user_id is not null
    group by moe.assigned_team_user_id
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

create or replace function public.rpc_get_task_completion_events(
  p_limit integer default 50,
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
  with filtered as (
    select
      tce.id,
      tce.task_id,
      t.title as task_title,
      t.status as task_status,
      t.priority as task_priority,
      tce.completed_by_user_id,
      coalesce(
        nullif(trim(concat_ws(' ',
          au.raw_user_meta_data ->> 'first_name',
          au.raw_user_meta_data ->> 'last_name'
        )), ''),
        au.raw_user_meta_data ->> 'full_name',
        au.email,
        tce.completed_by_user_id::text
      ) as completed_by_name,
      tce.assigned_to_user_id,
      tce.notes,
      tce.created_at
    from public.task_completion_events tce
    join public.tasks t on t.id = tce.task_id
    left join auth.users au on au.id = tce.completed_by_user_id
  ),
  paged as (
    select * from filtered
    order by created_at desc, id desc
    limit p_limit offset p_offset
  )
  select public.rpc_json_list_response(
    coalesce((select jsonb_agg(to_jsonb(paged)) from paged), '[]'::jsonb),
    (select count(*) from filtered),
    p_limit,
    p_offset
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.rpc_get_task_completion_events(integer, integer) to anon, authenticated, service_role;

commit;
