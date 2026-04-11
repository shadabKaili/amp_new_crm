-- ============================================================
-- AMP CRM - Backend Contract Implementation
-- Date: 2026-04-08
-- ============================================================

begin;

alter table if exists public.projects
  add column if not exists description text,
  add column if not exists status text default 'planning';

alter table if exists public.donations
  add column if not exists purpose text,
  add column if not exists notes text;

alter table if exists public.member_referrals
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.volunteer_applications
  add column if not exists motivation text,
  add column if not exists notes text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

drop trigger if exists trg_member_referrals_updated_at on public.member_referrals;
create trigger trg_member_referrals_updated_at
before update on public.member_referrals
for each row
execute function public.update_updated_at_column();

create or replace function public.derive_project_status(
  p_start_date date,
  p_end_date date,
  p_status text default null
)
returns text
language plpgsql
stable
as $$
begin
  if p_status is not null and btrim(p_status) <> '' then
    return p_status;
  end if;

  if p_start_date is not null and p_start_date > current_date then
    return 'planning';
  end if;

  if p_end_date is not null and p_end_date < current_date then
    return 'completed';
  end if;

  return 'active';
end;
$$;

create or replace function public.rpc_get_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_members', coalesce((select count(*) from public.members where is_active = true), 0),
    'approved_volunteers', coalesce((select count(*) from public.volunteer_applications where status in ('approved')), 0),
    'pending_tasks', coalesce((select count(*) from public.tasks where status = 'pending'), 0),
    'donations_this_month', coalesce((select sum(amount) from public.donations where created_at >= date_trunc('month', now())), 0),
    'member_growth',
      coalesce(
        round(
          (
            (
              select count(*)
              from public.members
              where created_at >= date_trunc('month', now())
            )::numeric
            /
            nullif(
              (
                select count(*)
                from public.members
                where created_at >= date_trunc('month', now() - interval '1 month')
                  and created_at < date_trunc('month', now())
              ),
              0
            )
          ) * 100,
          2
        ),
        0
      )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.rpc_get_current_user_context(
  p_user_id uuid,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_codes text[] := '{}'::text[];
  v_amp_id text := null;
  v_member_id uuid := null;
begin
  with role_rows as (
    select distinct
      r.code,
      case r.code
        when 'super_admin' then 3
        when 'manager' then 2
        when 'team_member' then 1
        else 0
      end as priority
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id
  )
  select coalesce(array_agg(code order by priority desc, code asc), '{}'::text[])
  into v_role_codes
  from role_rows;

  if p_email is not null then
    select m.id, m.amp_id
    into v_member_id, v_amp_id
    from public.members m
    where lower(m.email) = lower(p_email)
    order by m.created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'role_codes', coalesce(v_role_codes, '{}'::text[]),
    'member_id', v_member_id,
    'amp_id', v_amp_id
  );
end;
$$;

create or replace function public.rpc_get_members(
  p_search text default null,
  p_status text default null,
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
  with filtered as (
    select
      m.id,
      m.amp_id,
      m.full_name,
      m.email,
      m.phone,
      m.city,
      m.state,
      m.created_at,
      coalesce(ms.status, case when m.is_active then 'active' else 'inactive' end) as status,
      coalesce(sc.total_score, 0) as total_score,
      'member'::text as type
    from public.members m
    left join public.member_status ms on ms.member_id = m.id
    left join public.member_scores sc on sc.member_id = m.id
    where
      (p_search is null or m.full_name ilike '%' || p_search || '%' or coalesce(m.email, '') ilike '%' || p_search || '%' or coalesce(m.amp_id, '') ilike '%' || p_search || '%')
      and (p_status is null or coalesce(ms.status, case when m.is_active then 'active' else 'inactive' end) = p_status)
  ),
  paged as (
    select * from filtered
    order by created_at desc
    limit p_limit offset p_offset
  )
  select public.rpc_json_list_response(
    coalesce(
      (
        select jsonb_agg(to_jsonb(paged))
        from paged
      ),
      '[]'::jsonb
    ),
    (select count(*) from filtered),
    p_limit,
    p_offset
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.rpc_get_member_detail(
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
    'member',
      (
        select to_jsonb(m)
        from public.members m
        where m.id = p_member_id
      ),
    'status',
      (
        select to_jsonb(ms)
        from public.member_status ms
        where ms.member_id = p_member_id
      ),
    'score',
      (
        select to_jsonb(sc)
        from public.member_scores sc
        where sc.member_id = p_member_id
      )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.rpc_get_recent_activity(
  p_member_id uuid default null,
  p_type text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
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
  perform public.assert_bounded_activity_range(p_from, p_to);

  with filtered as (
    select
      a.id,
      a.member_id,
      m.full_name,
      at.code as activity_type,
      coalesce(at.description, at.code) as activity_label,
      a.score_earned,
      a.metadata,
      a.created_at
    from public.member_activities a
    join public.members m on m.id = a.member_id
    left join public.activity_types at on at.id = a.activity_type_id
    where
      a.created_at between p_from and p_to
      and (p_member_id is null or a.member_id = p_member_id)
      and (p_type is null or at.code = p_type)
  ),
  paged as (
    select * from filtered
    order by created_at desc
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

create or replace function public.rpc_get_member_dashboard(
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
    'amp_id', (select m.amp_id from public.members m where m.id = p_member_id),
    'score', coalesce((select sc.total_score from public.member_scores sc where sc.member_id = p_member_id), 0),
    'recent_activities',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id::text,
              'memberId', a.member_id::text,
              'memberName', m.full_name,
              'type', at.code,
              'title', coalesce(at.description, at.code),
              'scoreEarned', a.score_earned,
              'date', a.created_at,
              'metadata', a.metadata
            )
            order by a.created_at desc
          )
          from public.member_activities a
          join public.members m on m.id = a.member_id
          left join public.activity_types at on at.id = a.activity_type_id
          where a.member_id = p_member_id
            and a.created_at >= now() - interval '90 days'
        ),
        '[]'::jsonb
      ),
    'referrals_count', coalesce((select count(*) from public.member_referrals mr where mr.referrer_member_id = p_member_id), 0),
    'donations_total', coalesce((select sum(d.amount) from public.donations d where d.member_id = p_member_id), 0)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.rpc_get_tasks(
  p_status text default null,
  p_assigned_to uuid default null,
  p_priority text default null,
  p_related_member_id uuid default null,
  p_related_project_id bigint default null,
  p_related_volunteer_app_id bigint default null,
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
  with filtered as (
    select
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.due_date,
      t.assigned_to,
      null::text as assigned_user_name,
      t.related_member_id,
      rm.full_name as related_member_name,
      t.related_project_id,
      rp.name as related_project_name,
      t.related_volunteer_app_id,
      t.remarks,
      t.created_at,
      t.updated_at,
      t.completed_at
    from public.tasks t
    left join public.members rm on rm.id = t.related_member_id
    left join public.projects rp on rp.id = t.related_project_id
    where
      (p_status is null or t.status = p_status)
      and (p_assigned_to is null or t.assigned_to = p_assigned_to)
      and (p_priority is null or t.priority = p_priority)
      and (p_related_member_id is null or t.related_member_id = p_related_member_id)
      and (p_related_project_id is null or t.related_project_id = p_related_project_id)
      and (p_related_volunteer_app_id is null or t.related_volunteer_app_id = p_related_volunteer_app_id)
  ),
  paged as (
    select * from filtered
    order by coalesce(due_date, created_at) asc, created_at desc
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

create or replace function public.rpc_get_task_detail(
  p_task_id bigint
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
    'task',
      (
        select to_jsonb(task_row)
        from (
          select
            t.id::text as id,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.due_date as "dueDate",
            t.assigned_to as "assignedTo",
            null::text as "assignedToName",
            t.related_member_id::text as "relatedMemberId",
            rm.full_name as "relatedMemberName",
            t.related_project_id::text as "relatedProjectId",
            rp.name as "relatedProjectName",
            t.related_volunteer_app_id::text as "relatedVolunteerAppId",
            t.remarks,
            t.created_at as "createdAt",
            t.updated_at as "updatedAt",
            t.completed_at as "completedAt"
          from public.tasks t
          left join public.members rm on rm.id = t.related_member_id
          left join public.projects rp on rp.id = t.related_project_id
          where t.id = p_task_id
        ) as task_row
      )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.rpc_get_projects(
  p_status text default null,
  p_type text default null,
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
  with filtered as (
    select
      p.id,
      p.name,
      coalesce(p.description, '') as description,
      p.type,
      public.derive_project_status(p.start_date, p.end_date, p.status) as status,
      p.start_date,
      p.end_date,
      coalesce((select count(*) from public.project_members pm where pm.project_id = p.id), 0) as members_count,
      coalesce((select count(*) from public.tasks t where t.related_project_id = p.id), 0) as tasks_count,
      0::integer as volunteers_count
    from public.projects p
    where
      (p_type is null or p.type = p_type)
      and (p_status is null or public.derive_project_status(p.start_date, p.end_date, p.status) = p_status)
  ),
  paged as (
    select * from filtered
    order by start_date desc nulls last, id desc
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

create or replace function public.rpc_get_project_detail(
  p_project_id bigint
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
    'project',
      (
        select to_jsonb(project_row)
        from (
          select
            p.id,
            p.name,
            coalesce(p.description, '') as description,
            p.type,
            public.derive_project_status(p.start_date, p.end_date, p.status) as status,
            p.start_date,
            p.end_date,
            coalesce((select count(*) from public.project_members pm where pm.project_id = p.id), 0) as members_count,
            coalesce((select count(*) from public.tasks t where t.related_project_id = p.id), 0) as tasks_count,
            0::integer as volunteers_count
          from public.projects p
          where p.id = p_project_id
        ) as project_row
      ),
    'members',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'member_id', pm.member_id,
              'member_name', m.full_name,
              'role', pm.role
            )
          )
          from public.project_members pm
          join public.members m on m.id = pm.member_id
          where pm.project_id = p_project_id
        ),
        '[]'::jsonb
      ),
    'tasks',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', t.id,
              'title', t.title,
              'status', t.status,
              'priority', t.priority
            )
          )
          from public.tasks t
          where t.related_project_id = p_project_id
        ),
        '[]'::jsonb
      )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.rpc_get_donations(
  p_member_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
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
  with filtered as (
    select
      d.id,
      d.member_id,
      m.full_name,
      d.amount,
      d.payment_mode,
      d.reference_no,
      d.purpose,
      d.notes,
      d.created_at
    from public.donations d
    join public.members m on m.id = d.member_id
    where
      (p_member_id is null or d.member_id = p_member_id)
      and (p_from is null or d.created_at >= p_from)
      and (p_to is null or d.created_at <= p_to)
  ),
  paged as (
    select * from filtered
    order by created_at desc
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

create or replace function public.rpc_get_referrals(
  p_status text default null,
  p_referrer_member_id uuid default null,
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
  with filtered as (
    select
      mr.id,
      mr.referrer_member_id,
      referrer.full_name as referrer_name,
      mr.referred_name,
      mr.referred_email,
      mr.referred_phone,
      mr.status,
      mr.joined_member_id,
      case when mr.status = 'approved' then 150 else 0 end as points_earned,
      mr.created_at,
      mr.updated_at
    from public.member_referrals mr
    join public.members referrer on referrer.id = mr.referrer_member_id
    where
      (p_status is null or mr.status = p_status)
      and (p_referrer_member_id is null or mr.referrer_member_id = p_referrer_member_id)
  ),
  paged as (
    select * from filtered
    order by created_at desc
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

create or replace function public.rpc_get_volunteer_applications(
  p_status text default null,
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
  with filtered as (
    select
      va.id,
      va.full_name,
      va.phone,
      va.email,
      va.city,
      va.skills,
      va.availability,
      va.motivation,
      va.referred_by_amp_id,
      va.referrer_member_id,
      case when va.status = 'applied' then 'pending' else va.status end as status,
      va.notes,
      va.reviewed_at,
      va.reviewed_by,
      va.created_at
    from public.volunteer_applications va
    where
      (
        p_status is null
        or (p_status = 'pending' and va.status in ('pending', 'applied'))
        or (p_status <> 'pending' and va.status = p_status)
      )
  ),
  paged as (
    select * from filtered
    order by created_at desc
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
  with grouped as (
    select
      coalesce(internal_user_id::text, 'unassigned') as team_member,
      max(case when metric = 'tasks_completed' then value else 0 end) as tasks_completed,
      max(case when metric = 'members_onboarded' then value else 0 end) as members_onboarded,
      max(case when metric = 'avg_response_time' then value else 0 end) as avg_response_time
    from public.internal_user_kpis
    group by coalesce(internal_user_id::text, 'unassigned')
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

grant execute on function public.rpc_get_dashboard_stats() to anon, authenticated, service_role;
grant execute on function public.rpc_get_current_user_context(uuid, text) to anon, authenticated, service_role;
grant execute on function public.rpc_get_members(text, text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_member_detail(uuid) to anon, authenticated, service_role;
grant execute on function public.rpc_get_recent_activity(uuid, text, timestamptz, timestamptz, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_member_dashboard(uuid) to anon, authenticated, service_role;
grant execute on function public.rpc_get_tasks(text, uuid, text, uuid, bigint, bigint, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_task_detail(bigint) to anon, authenticated, service_role;
grant execute on function public.rpc_get_projects(text, text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_project_detail(bigint) to anon, authenticated, service_role;
grant execute on function public.rpc_get_donations(uuid, timestamptz, timestamptz, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_referrals(text, uuid, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_volunteer_applications(text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.rpc_get_internal_user_kpis(integer, integer) to anon, authenticated, service_role;

commit;
