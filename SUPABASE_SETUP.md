# Supabase Integration Instructions

## Step 1: Apply Database Migrations

Run the SQL migrations in your Supabase SQL Editor in this order:

1. `supabase/migrations/add_tasks_table.sql`
2. `supabase/migrations/20260408_amp_crm_rpc_edge_contract.sql`
3. `supabase/migrations/20260408_amp_crm_backend_contract.sql`
4. Optional: `supabase/migrations/insert_sample_data.sql`

This sets up:
- the `tasks` table and triggers
- helper functions for normalized JSON RPC responses
- bounded activity-query enforcement for partition pruning
- read RPCs for dashboard, members, tasks, projects, donations, referrals, volunteers, and KPIs
- schema additions used by the internal MVP UI

## Step 2: Set Environment Variables

Update `.env.local` for the frontend:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Set these for Supabase Edge Functions:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 3: Deploy Edge Functions

Deploy the functions in `supabase/functions/`:

- `fn_upsert_member`
- `fn_upsert_task`
- `fn_upsert_project`
- `fn_create_donation`
- `fn_upsert_referral`
- `fn_upsert_volunteer_application`

## Step 4: Restart Dev Server

```bash
npm run dev
```

## Step 5: Test the Integration

### 5.1 Test Authentication

1. Open `http://localhost:3000/auth/login`
2. Enter an internal AMP staff email
3. Verify the OTP email flow completes
4. Confirm the user has a role in `roles` / `user_roles`

### 5.2 Test Core RPC Screens

Check these routes after the migrations are applied:

- `/dashboard`
- `/members`
- `/tasks`
- `/projects`
- `/activities`
- `/donations`
- `/referrals`
- `/volunteer-applications`
- `/kpis`

### 5.3 Test Write Paths

Verify create flows or review actions on:

- members
- tasks
- projects
- donations
- referrals
- volunteer applications

## Current State

- Read APIs are standardized around `supabase.rpc(...)`
- Write APIs are standardized around `supabase.functions.invoke(...)`
- OTP login is wired for internal staff
- Internal-role route protection is enabled
- The dashboard and core internal modules are wired to the new contract

## Troubleshooting

### "relation 'tasks' does not exist"

Run the SQL migrations in order and verify:

```sql
select * from public.tasks limit 1;
```

### Edge Function returns 500

- confirm `SUPABASE_SERVICE_ROLE_KEY` is configured
- redeploy the affected Edge Function
- confirm the backend contract migrations were applied first

### Auth not working

- confirm the user exists in Supabase Auth
- confirm their staff role exists in `user_roles`
- confirm OTP/email auth is enabled in your Supabase Auth settings

## Files To Apply

- `supabase/migrations/add_tasks_table.sql`
- `supabase/migrations/20260408_amp_crm_rpc_edge_contract.sql`
- `supabase/migrations/20260408_amp_crm_backend_contract.sql`
- `supabase/functions/*`
