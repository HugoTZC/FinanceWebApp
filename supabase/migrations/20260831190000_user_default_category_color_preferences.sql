create table if not exists public.user_default_category_preferences (
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  color varchar(20) not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table public.user_default_category_preferences enable row level security;
alter table public.user_default_category_preferences force row level security;

revoke all on table public.user_default_category_preferences from public, anon, authenticated;
grant all on table public.user_default_category_preferences to service_role;

comment on table public.user_default_category_preferences is
  'Server-managed, per-user color overrides for immutable default categories.';
