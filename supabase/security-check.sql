-- Run AFTER schema.sql in Supabase SQL Editor. Everything rolls back.
begin;
insert into public.wishlist_items(id,name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Temporary permission test');
set local role anon;
do $$
begin
  if not exists(select 1 from public.wishlist_items where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'FAIL: public read'; end if;
  if not public.mark_purchased('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'FAIL: initial purchase'; end if;
  if public.mark_purchased('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'FAIL: duplicate purchase'; end if;
  begin
    update public.wishlist_items set purchased_at=null where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'FAIL: anonymous update allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.wishlist_items(name) values ('Not allowed');
    raise exception 'FAIL: anonymous insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.wishlist_items where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'FAIL: anonymous delete allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.wishlist_admins;
    raise exception 'FAIL: allowlist readable';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: public read, atomic purchase, duplicate rejection, and anonymous write restrictions';
end $$;
reset role;
-- A signed-in user without an allowlist entry must also be unable to edit.
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}',true);
set local role authenticated;
do $$
declare changed integer;
begin
  if public.is_wishlist_admin() then raise exception 'FAIL: non-owner is admin'; end if;
  update public.wishlist_items set name='Not allowed' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL: non-owner update'; end if;
  delete from public.wishlist_items where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL: non-owner delete'; end if;
  begin
    insert into public.wishlist_items(name) values ('Not allowed');
    raise exception 'FAIL: non-owner insert allowed';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: authenticated non-owner cannot edit';
end $$;
reset role;
rollback;
