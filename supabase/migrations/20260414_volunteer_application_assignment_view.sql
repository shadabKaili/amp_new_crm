-- ============================================================
-- AMP CRM - VOLUNTEER APPLICATION ASSIGNMENT VIEW
-- ============================================================
-- Surfaces onboarding-team assignment metadata in the volunteer
-- application listing RPC.
-- ============================================================

BEGIN;

create or replace function public.rpc_get_volunteer_applications(
  p_status text default null,
  p_assigned_team_user_id uuid default null,
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
      va.assigned_team_user_id,
      case when va.status = 'applied' then 'pending' else va.status end as status,
      va.notes,
      va.reviewed_at,
      va.reviewed_by,
      coalesce(
        nullif(trim(concat_ws(' ',
          au.raw_user_meta_data ->> 'first_name',
          au.raw_user_meta_data ->> 'last_name'
        )), ''),
        au.raw_user_meta_data ->> 'full_name',
        au.email,
        va.assigned_team_user_id::text
      ) as assigned_team_member_name,
      va.created_at
    from public.volunteer_applications va
    left join auth.users au on au.id = va.assigned_team_user_id
    where
      (
        p_status is null
        or (p_status = 'pending' and va.status in ('pending', 'applied'))
        or (p_status <> 'pending' and va.status = p_status)
      )
      and (p_assigned_team_user_id is null or va.assigned_team_user_id = p_assigned_team_user_id)
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

grant execute on function public.rpc_get_volunteer_applications(text, uuid, integer, integer) to anon, authenticated, service_role;

commit;
