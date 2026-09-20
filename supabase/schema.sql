-- Run once in the SQL Editor of a NEW Supabase project, as project owner.
-- Re-running fails safely rather than silently replacing existing policies.
begin;

create table public.wishlist_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.wishlist_admins enable row level security;
revoke all on public.wishlist_admins from public, anon, authenticated;
-- No API policies or grants: only the project owner manages this allowlist.

create function public.is_wishlist_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.wishlist_admins where user_id = auth.uid()); $$;
revoke all on function public.is_wishlist_admin() from public, anon, authenticated;
grant execute on function public.is_wishlist_admin() to authenticated;

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  image_url text not null default '' check (char_length(image_url) <= 2048),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 10),
  is_sample boolean not null default false,
  sort_order integer not null default 0 check (sort_order between -100000 and 100000),
  purchased_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.wishlist_items enable row level security;
revoke all on public.wishlist_items from public, anon, authenticated;
grant select on public.wishlist_items to anon, authenticated;
grant insert, update, delete on public.wishlist_items to authenticated;
create policy "Everyone can read the wishlist" on public.wishlist_items for select to anon, authenticated using (true);
create policy "Owner inserts" on public.wishlist_items for insert to authenticated with check ((select public.is_wishlist_admin()));
create policy "Owner edits" on public.wishlist_items for update to authenticated using ((select public.is_wishlist_admin())) with check ((select public.is_wishlist_admin()));
create policy "Owner removes" on public.wishlist_items for delete to authenticated using ((select public.is_wishlist_admin()));

-- Only this narrow operation bypasses RLS for visitors. The conditional UPDATE
-- is atomic: two simultaneous confirmations cannot both return true.
-- No arbitrary fields, reset, buyer identity, or dynamic SQL are accepted.
create function public.mark_purchased(item_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare changed integer;
begin
  update public.wishlist_items set purchased_at = now()
  where id = item_id and purchased_at is null;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.mark_purchased(uuid) from public, anon, authenticated;
grant execute on function public.mark_purchased(uuid) to anon, authenticated;
commit;
