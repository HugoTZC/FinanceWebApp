alter table public.transactions
  add column if not exists receipt_path text;

comment on column public.transactions.receipt_path is
  'Private Supabase Storage object path for the authenticated user transaction receipt.';
