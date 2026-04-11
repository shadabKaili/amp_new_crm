-- ============================================================
-- AMP CRM - ONBOARDING TEAM ASSIGNMENTS
-- ============================================================
-- Adds a dedicated onboarding-team flag for internal users and
-- automatic round-robin assignment helpers for volunteer apps.
-- ============================================================

BEGIN;

create table if not exists public.onboarding_team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_onboarding_team boolean not null default false,
  last_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_onboarding_team_members_is_onboarding_team
  on public.onboarding_team_members(is_onboarding_team);

create index if not exists idx_onboarding_team_members_last_assigned_at
  on public.onboarding_team_members(last_assigned_at);

drop trigger if exists trg_onboarding_team_members_updated_at on public.onboarding_team_members;
create trigger trg_onboarding_team_members_updated_at
before update on public.onboarding_team_members
for each row
execute function public.update_updated_at_column();

comment on table public.onboarding_team_members is 'Per-internal-user onboarding settings and round-robin assignment metadata.';
comment on column public.onboarding_team_members.is_onboarding_team is 'Marks whether this internal user is part of the onboarding team.';

alter table if exists public.volunteer_applications
  add column if not exists assigned_team_user_id uuid references auth.users(id) on delete set null;

create or replace function public.rpc_get_onboarding_team_members(
  p_limit integer default 100,
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
      ) as team_member_name,
      au.email
    from role_rows rr
    left join auth.users au on au.id = rr.user_id
  ),
  grouped as (
    select
      iu.user_id,
      iu.team_member_name,
      iu.email,
      coalesce(otm.is_onboarding_team, false) as is_onboarding_team,
      otm.last_assigned_at,
      coalesce(
        (
          select count(*)
          from public.volunteer_applications va
          where va.assigned_team_user_id = iu.user_id
        ),
        0
      )::integer as assigned_volunteer_apps
    from internal_users iu
    left join public.onboarding_team_members otm on otm.user_id = iu.user_id
  ),
  paged as (
    select *
    from grouped
    order by is_onboarding_team desc, team_member_name asc
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

grant execute on function public.rpc_get_onboarding_team_members(integer, integer) to anon, authenticated, service_role;

create or replace function public.rpc_assign_next_onboarding_team_member()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  with eligible as (
    select distinct otm.user_id
    from public.onboarding_team_members otm
    where otm.is_onboarding_team = true
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = otm.user_id
          and r.code in ('super_admin', 'manager', 'team_member')
      )
    order by otm.last_assigned_at nulls first, otm.updated_at asc, otm.user_id asc
    limit 1
    for update skip locked
  )
  update public.onboarding_team_members otm
  set last_assigned_at = now(),
      updated_at = now()
  from eligible
  where otm.user_id = eligible.user_id
  returning otm.user_id into v_user_id;

  return v_user_id;
end;
$$;

grant execute on function public.rpc_assign_next_onboarding_team_member() to anon, authenticated, service_role;

commit;
