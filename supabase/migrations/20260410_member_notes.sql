-- AMP CRM - MEMBER NOTES
-- ============================================================
-- Stores internal remarks and follow-up notes against members.
-- ============================================================

BEGIN;

create table if not exists public.member_notes (
  id bigserial primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_member_notes_member_id
  on public.member_notes(member_id);
create index if not exists idx_member_notes_created_at
  on public.member_notes(created_at);

comment on table public.member_notes is 'Internal remarks and follow-up notes for members.';

COMMIT;
