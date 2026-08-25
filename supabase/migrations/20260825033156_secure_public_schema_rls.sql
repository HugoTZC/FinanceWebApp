-- Security baseline for the current public schema.
-- Review existing pg_policies before applying: permissive policies are ORed.
-- The legacy backend uses service_role server-side and therefore bypasses RLS;
-- these policies prepare direct access for the Supabase Auth migration.

begin;

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated, service_role;

grant select on public.categories to authenticated;
grant select, insert, update, delete on
  public.users,
  public.user_settings,
  public.notification_preferences,
  public.user_categories,
  public.bank_accounts,
  public.credit_cards,
  public.loans,
  public.savings_goals,
  public.recurring_payments,
  public.transactions,
  public.budget_periods,
  public.budget_categories,
  public.budget_alerts,
  public.notifications
to authenticated;

alter table public.categories enable row level security;
alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_categories enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.credit_cards enable row level security;
alter table public.loans enable row level security;
alter table public.savings_goals enable row level security;
alter table public.recurring_payments enable row level security;
alter table public.transactions enable row level security;
alter table public.budget_periods enable row level security;
alter table public.budget_categories enable row level security;
alter table public.budget_alerts enable row level security;
alter table public.notifications enable row level security;

do $$
declare
  table_name text;
  policy_name text;
begin
  policy_name := 'mx_finanzas_categories_read';
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = policy_name
  ) then
    create policy mx_finanzas_categories_read
      on public.categories for select to authenticated
      using (true);
  end if;

  foreach table_name in array array[
    'user_settings',
    'notification_preferences',
    'user_categories',
    'bank_accounts',
    'credit_cards',
    'loans',
    'savings_goals',
    'recurring_payments',
    'transactions',
    'budget_periods',
    'budget_alerts',
    'notifications'
  ]
  loop
    policy_name := format('mx_finanzas_%s_select', table_name);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
        policy_name,
        table_name
      );
    end if;

    policy_name := format('mx_finanzas_%s_insert', table_name);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
        policy_name,
        table_name
      );
    end if;

    policy_name := format('mx_finanzas_%s_update', table_name);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
        policy_name,
        table_name
      );
    end if;

    policy_name := format('mx_finanzas_%s_delete', table_name);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
        policy_name,
        table_name
      );
    end if;
  end loop;
end
$$;

create policy mx_finanzas_users_select
  on public.users for select to authenticated
  using ((select auth.uid()) = id);
create policy mx_finanzas_users_insert
  on public.users for insert to authenticated
  with check ((select auth.uid()) = id);
create policy mx_finanzas_users_update
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy mx_finanzas_users_delete
  on public.users for delete to authenticated
  using ((select auth.uid()) = id);

create policy mx_finanzas_budget_categories_select
  on public.budget_categories for select to authenticated
  using (
    exists (
      select 1
      from public.budget_periods
      where budget_periods.id = budget_categories.budget_period_id
        and budget_periods.user_id = (select auth.uid())
    )
  );
create policy mx_finanzas_budget_categories_insert
  on public.budget_categories for insert to authenticated
  with check (
    exists (
      select 1
      from public.budget_periods
      where budget_periods.id = budget_categories.budget_period_id
        and budget_periods.user_id = (select auth.uid())
    )
  );
create policy mx_finanzas_budget_categories_update
  on public.budget_categories for update to authenticated
  using (
    exists (
      select 1
      from public.budget_periods
      where budget_periods.id = budget_categories.budget_period_id
        and budget_periods.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.budget_periods
      where budget_periods.id = budget_categories.budget_period_id
        and budget_periods.user_id = (select auth.uid())
    )
  );
create policy mx_finanzas_budget_categories_delete
  on public.budget_categories for delete to authenticated
  using (
    exists (
      select 1
      from public.budget_periods
      where budget_periods.id = budget_categories.budget_period_id
        and budget_periods.user_id = (select auth.uid())
    )
  );

create index if not exists user_categories_user_id_idx on public.user_categories (user_id);
create index if not exists bank_accounts_user_id_idx on public.bank_accounts (user_id);
create index if not exists credit_cards_user_id_idx on public.credit_cards (user_id);
create index if not exists loans_user_id_idx on public.loans (user_id);
create index if not exists savings_goals_user_id_idx on public.savings_goals (user_id);
create index if not exists recurring_payments_user_id_idx on public.recurring_payments (user_id);
create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_category_id_idx on public.transactions (category_id);
create index if not exists transactions_user_category_id_idx on public.transactions (user_category_id);
create index if not exists transactions_bank_account_id_idx on public.transactions (bank_account_id);
create index if not exists transactions_credit_card_id_idx on public.transactions (credit_card_id);
create index if not exists transactions_savings_goal_id_idx on public.transactions (savings_goal_id);
create index if not exists transactions_recurring_payment_id_idx on public.transactions (recurring_payment_id);
create index if not exists budget_categories_budget_period_id_idx on public.budget_categories (budget_period_id);
create index if not exists budget_categories_category_id_idx on public.budget_categories (category_id);
create index if not exists budget_categories_user_category_id_idx on public.budget_categories (user_category_id);
create index if not exists budget_alerts_user_id_idx on public.budget_alerts (user_id);
create index if not exists budget_alerts_budget_category_id_idx on public.budget_alerts (budget_category_id);
create index if not exists notifications_user_id_idx on public.notifications (user_id);

commit;
