alter table public.users
  add column if not exists password_changed_at timestamptz,
  add column if not exists password_reset_token text,
  add column if not exists password_reset_expires timestamptz;

create unique index if not exists users_password_reset_token_idx
  on public.users (password_reset_token)
  where password_reset_token is not null;

create table if not exists public.auth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_refresh_tokens_active_user_idx
  on public.auth_refresh_tokens (user_id, expires_at)
  where revoked_at is null;

alter table public.auth_refresh_tokens enable row level security;

revoke all on table public.auth_refresh_tokens from anon, authenticated;
revoke all on table public.auth_refresh_tokens from public;
