-- ============================================================
-- AMP CRM - TASKS TABLE ADDITION
-- ============================================================
-- This script adds the tasks table to support task management
-- with linking to members, projects, and volunteer applications.
-- ============================================================

BEGIN;

-- =========================
-- TASKS TABLE
-- =========================
create table if not exists public.tasks (
  id bigserial primary key,
  title text not null,
  description text,
  status text not null default 'pending',
  priority text not null default 'medium',
  due_date timestamptz,
  
  -- Assignment
  assigned_to uuid references public.app_users(id),
  
  -- Relationships (nullable - task can be linked to any/none)
  related_member_id uuid references public.members(id) on delete set null,
  related_project_id bigint references public.projects(id) on delete set null,
  related_volunteer_app_id bigint references public.volunteer_applications(id) on delete set null,
  
  -- Additional fields
  remarks text,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.app_users(id)
);

-- Indexes for performance
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_related_member on public.tasks(related_member_id);
create index if not exists idx_tasks_related_project on public.tasks(related_project_id);
create index if not exists idx_tasks_related_volunteer_app on public.tasks(related_volunteer_app_id);

-- Comments for documentation
comment on table public.tasks is 'Internal task management with links to members, projects, and volunteer applications';
comment on column public.tasks.status is 'Task status: pending, in_progress, completed, delayed';
comment on column public.tasks.priority is 'Task priority: low, medium, high';

-- Trigger to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_updated_at on public.tasks;

create trigger trg_tasks_updated_at
before update on public.tasks
for each row
execute function public.update_updated_at_column();

-- Trigger to set completed_at when status changes to completed
create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    new.completed_at = now();
  elsif new.status != 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_completed_at on public.tasks;

create trigger trg_tasks_completed_at
before update on public.tasks
for each row
execute function public.set_task_completed_at();

COMMIT;

-- ============================================================
-- ACTIVITY TYPES SEED DATA (Optional but recommended)
-- ============================================================
-- Populate common activity types with default scores
-- ============================================================

BEGIN;

-- Insert common activity types if they don't exist
insert into public.activity_types (code, description, score, is_active)
values
  ('donation', 'Member made a donation', 100, true),
  ('referral', 'Member referred a new member', 150, true),
  ('volunteer', 'Member volunteered at an event', 200, true),
  ('event_attendance', 'Member attended an AMP event', 50, true),
  ('workshop_completion', 'Member completed a training workshop', 100, true),
  ('project_participation', 'Member actively participated in a project', 150, true)
on conflict (code) do nothing;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the schema was created correctly
-- ============================================================

-- Check tasks table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'tasks'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'tasks' AND schemaname = 'public';

-- Check triggers
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'tasks';

-- Verify activity types
-- SELECT * FROM public.activity_types;
