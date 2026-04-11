-- ============================================================
-- AMP CRM - Project Engagement
-- Date: 2026-04-09
-- ============================================================

begin;

create table if not exists public.project_participation_requests (
  id bigserial primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_participation_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint project_participation_requests_unique_member_per_project
    unique (project_id, member_id)
);

create index if not exists idx_project_participation_requests_project_id
  on public.project_participation_requests(project_id);
create index if not exists idx_project_participation_requests_member_id
  on public.project_participation_requests(member_id);
create index if not exists idx_project_participation_requests_status
  on public.project_participation_requests(status);

drop trigger if exists trg_project_participation_requests_updated_at on public.project_participation_requests;
create trigger trg_project_participation_requests_updated_at
before update on public.project_participation_requests
for each row
execute function public.update_updated_at_column();

create table if not exists public.project_events (
  id bigserial primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'event',
  event_date timestamptz not null,
  score_value integer not null default 0,
  status text not null default 'upcoming',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_events_type_check
    check (event_type in ('webinar', 'meeting', 'event', 'workshop')),
  constraint project_events_status_check
    check (status in ('upcoming', 'completed', 'cancelled'))
);

create index if not exists idx_project_events_project_id
  on public.project_events(project_id);
create index if not exists idx_project_events_event_date
  on public.project_events(event_date);
create index if not exists idx_project_events_status
  on public.project_events(status);

drop trigger if exists trg_project_events_updated_at on public.project_events;
create trigger trg_project_events_updated_at
before update on public.project_events
for each row
execute function public.update_updated_at_column();

create table if not exists public.project_activity_submissions (
  id bigserial primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  project_event_id bigint references public.project_events(id) on delete set null,
  member_id uuid not null references public.members(id) on delete cascade,
  activity_type text not null default 'attended_event',
  notes text,
  score_awarded integer not null default 0,
  status text not null default 'approved',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  constraint project_activity_submissions_status_check
    check (status in ('submitted', 'approved', 'rejected')),
  constraint project_activity_submissions_unique_event_member
    unique (project_event_id, member_id)
);

create index if not exists idx_project_activity_submissions_project_id
  on public.project_activity_submissions(project_id);
create index if not exists idx_project_activity_submissions_project_event_id
  on public.project_activity_submissions(project_event_id);
create index if not exists idx_project_activity_submissions_member_id
  on public.project_activity_submissions(member_id);
create index if not exists idx_project_activity_submissions_status
  on public.project_activity_submissions(status);

insert into public.activity_types (code, description, score, is_active)
values
  ('project_participation', 'Member requested to participate in a project', 50, true),
  ('event_attendance', 'Member attended a project event', 100, true),
  ('webinar_attendance', 'Member attended a webinar', 75, true),
  ('meeting_attendance', 'Member attended a project meeting', 60, true),
  ('participated_in_workshop', 'Member participated in a project workshop', 90, true)
on conflict (code) do nothing;

create or replace function public.rpc_get_project_events(
  p_project_id bigint,
  p_status text default null,
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
      pe.id,
      pe.project_id,
      pe.title,
      pe.description,
      pe.event_type,
      pe.event_date,
      pe.score_value,
      pe.status,
      coalesce((select count(*) from public.project_activity_submissions pas where pas.project_event_id = pe.id), 0) as submissions_count
    from public.project_events pe
    where pe.project_id = p_project_id
      and (p_status is null or pe.status = p_status)
  ),
  paged as (
    select * from filtered
    order by event_date asc, id asc
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

create or replace function public.rpc_get_project_participation_requests(
  p_project_id bigint,
  p_status text default null,
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
      ppr.id,
      ppr.project_id,
      ppr.member_id,
      m.full_name as member_name,
      m.email as member_email,
      ppr.note,
      ppr.status,
      ppr.created_at,
      ppr.updated_at
    from public.project_participation_requests ppr
    join public.members m on m.id = ppr.member_id
    where ppr.project_id = p_project_id
      and (p_status is null or ppr.status = p_status)
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

create or replace function public.rpc_get_project_activity_submissions(
  p_project_id bigint,
  p_member_id uuid default null,
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
      pas.id,
      pas.project_id,
      pas.project_event_id,
      pas.member_id,
      m.full_name as member_name,
      pe.title as event_title,
      pe.event_type,
      pas.activity_type,
      pas.notes,
      pas.score_awarded,
      pas.status,
      pas.submitted_at,
      pas.reviewed_at,
      pas.reviewed_by
    from public.project_activity_submissions pas
    join public.members m on m.id = pas.member_id
    left join public.project_events pe on pe.id = pas.project_event_id
    where pas.project_id = p_project_id
      and (p_member_id is null or pas.member_id = p_member_id)
  ),
  paged as (
    select * from filtered
    order by submitted_at desc, id desc
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

create or replace function public.rpc_get_project_member_state(
  p_project_id bigint,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'is_participant', exists(
      select 1 from public.project_members pm
      where pm.project_id = p_project_id
        and pm.member_id = p_member_id
    ),
    'request_status', (
      select ppr.status
      from public.project_participation_requests ppr
      where ppr.project_id = p_project_id
        and ppr.member_id = p_member_id
      order by ppr.updated_at desc, ppr.id desc
      limit 1
    ),
    'request_id', (
      select ppr.id
      from public.project_participation_requests ppr
      where ppr.project_id = p_project_id
        and ppr.member_id = p_member_id
      order by ppr.updated_at desc, ppr.id desc
      limit 1
    ),
    'latest_submission_at', (
      select pas.submitted_at
      from public.project_activity_submissions pas
      where pas.project_id = p_project_id
        and pas.member_id = p_member_id
      order by pas.submitted_at desc, pas.id desc
      limit 1
    ),
    'latest_submission_score', (
      select pas.score_awarded
      from public.project_activity_submissions pas
      where pas.project_id = p_project_id
        and pas.member_id = p_member_id
      order by pas.submitted_at desc, pas.id desc
      limit 1
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.rpc_get_project_events(bigint, text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_project_participation_requests(bigint, text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_project_activity_submissions(bigint, uuid, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_project_member_state(bigint, uuid) to anon, authenticated, service_role;

commit;
