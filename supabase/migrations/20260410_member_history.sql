-- AMP CRM - MEMBER HISTORY
-- ============================================================
-- Adds call, message, and blacklist history for member profiles.
-- Remarks are stored in member_notes.
-- ============================================================

BEGIN;

create table if not exists public.member_calls (
  id bigserial primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  call_at timestamptz not null,
  reason text not null,
  outcome text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_member_calls_member_id
  on public.member_calls(member_id);
create index if not exists idx_member_calls_call_at
  on public.member_calls(call_at);

comment on table public.member_calls is 'Internal call history for members.';

create table if not exists public.member_messages (
  id bigserial primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  channel text not null default 'whatsapp',
  direction text not null default 'sent',
  message text not null,
  sent_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint member_messages_channel_check
    check (channel in ('whatsapp', 'email', 'sms', 'call')),
  constraint member_messages_direction_check
    check (direction in ('sent', 'received'))
);

create index if not exists idx_member_messages_member_id
  on public.member_messages(member_id);
create index if not exists idx_member_messages_sent_at
  on public.member_messages(sent_at);

comment on table public.member_messages is 'Messages sent to or received from a member.';

create table if not exists public.member_blacklists (
  id bigserial primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  reason text not null,
  is_active boolean not null default true,
  blacklisted_at timestamptz not null default now(),
  removed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_member_blacklists_member_id
  on public.member_blacklists(member_id);
create index if not exists idx_member_blacklists_is_active
  on public.member_blacklists(is_active);

comment on table public.member_blacklists is 'Blacklist state and reason for a member.';

COMMIT;
