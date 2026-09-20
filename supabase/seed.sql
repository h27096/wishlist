-- Optional sample data. Safe to rerun; existing rows are not overwritten.
insert into public.wishlist_items (id,name,description,image_url,links,is_sample,sort_order,purchased_at) values
('11111111-1111-4111-8111-111111111111','A building set for my desk','Something fun to build on a quiet weekend. Replace this with the exact set, size, and edition.','assets/blocks.svg','[{"label":"LEGO (sample store)","url":"https://www.lego.com/"}]',true,0,null),
('22222222-2222-4222-8222-222222222222','Wireless gaming headset','For game nights and catching up with friends. Add the specific model and preferred color here.','assets/headphones.svg','[{"label":"Best Buy (sample store)","url":"https://www.bestbuy.com/"}]',true,1,null),
('33333333-3333-4333-8333-333333333333','A notebook for big ideas','A place for sketches, plans, and everything in between. This sample shows how a purchased gift looks.','assets/notebook.svg','[{"label":"Target (sample store)","url":"https://www.target.com/"}]',true,2,'2026-01-01T00:00:00Z')
on conflict (id) do nothing;
