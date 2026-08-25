-- Security baseline for the current server-only public schema.
--
-- The application still authenticates against public.users and accesses the
-- Data API with a server-side secret key. public.users is not linked to
-- auth.users, so auth.uid()-based ownership policies would not match the
-- application's current identities. Keep direct Data API access closed until
-- that identity migration is implemented and verified separately.

begin;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on schema public from anon, authenticated;

-- New public-schema objects must remain server-only by default.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

grant usage on schema public to service_role;

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
