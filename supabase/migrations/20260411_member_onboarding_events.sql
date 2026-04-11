-- ============================================================
-- AMP CRM - MEMBER ONBOARDING EVENTS
-- ============================================================
-- Tracks explicit onboarding actions so KPI counts are event-based
-- instead of inferred from member assignment state.
-- ============================================================

BEGIN;

create table if not exists public.member_onboarding_events (
  id bigserial primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  event_type text not null default 'member_onboarded',
  assigned_team_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint member_onboarding_events_event_type_check
    check (event_type in ('member_onboarded'))
);

create unique index if not exists ux_member_onboarding_events_member_type
  on public.member_onboarding_events(member_id, event_type);
create index if not exists idx_member_onboarding_events_assigned_team_user_id
  on public.member_onboarding_events(assigned_team_user_id);
create index if not exists idx_member_onboarding_events_created_at
  on public.member_onboarding_events(created_at);

comment on table public.member_onboarding_events is 'Explicit onboarding events recorded when a member is activated by an internal user.';

insert into public.member_onboarding_events (
  member_id,
  event_type,
  assigned_team_user_id,
  notes,
  created_at
)
select
  ms.member_id,
  'member_onboarded',
  ms.assigned_team_user_id,
  'Backfilled from active member status',
  coalesce(m.created_at, now())
from public.member_status ms
join public.members m on m.id = ms.member_id
where coalesce(ms.status, case when m.is_active then 'active' else 'inactive' end) = 'active'
on conflict (member_id, event_type) do nothing;

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

create or replace function public.rpc_get_member_onboarding_events(
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
      moe.id,
      moe.member_id,
      m.amp_id as member_amp_id,
      m.full_name as member_name,
      m.email as member_email,
      moe.assigned_team_user_id,
      coalesce(
        nullif(trim(concat_ws(' ',
          au.raw_user_meta_data ->> 'first_name',
          au.raw_user_meta_data ->> 'last_name'
        )), ''),
        au.raw_user_meta_data ->> 'full_name',
        au.email,
        moe.assigned_team_user_id::text
      ) as team_member_name,
      moe.event_type,
      moe.notes,
      moe.created_at
    from public.member_onboarding_events moe
    join public.members m on m.id = moe.member_id
    left join auth.users au on au.id = moe.assigned_team_user_id
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

grant execute on function public.rpc_get_member_onboarding_events(integer, integer) to anon, authenticated, service_role;

commit;
