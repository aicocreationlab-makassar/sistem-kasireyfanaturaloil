-- Seed after copying the three supplied EYFA images into /public. HPP intentionally NULL.
insert into public.products(name,variant,size_ml,sku,barcode_value,barcode_type,selling_price,hpp,stock_quantity,low_stock_threshold,image_url)
values
('Minyak Kemiri Hitam 60 ml','Hitam',60,'EYFA-HITAM-60','EYFA-EYFA-HITAM-60','qr',55000,null,0,5,'/products/minyak-kemirihitam.png'),
('Minyak Kemiri Bakar 60 ml','Bakar',60,'EYFA-BAKAR-60','EYFA-EYFA-BAKAR-60','qr',55000,null,0,5,'/products/minyak-kemiribakar.png'),
('Minyak Kemiri Murni 60 ml','Murni',60,'EYFA-MURNI-60','EYFA-EYFA-MURNI-60','qr',55000,null,0,5,'/products/minyak-kemirimurni.png'),
('Minyak Kemiri Bakar 100 ml','Bakar',100,'EYFA-BAKAR-100','EYFA-EYFA-BAKAR-100','qr',70000,null,0,5,'/products/minyak-kemiribakar.png'),
('Minyak Kemiri Murni 100 ml','Murni',100,'EYFA-MURNI-100','EYFA-EYFA-MURNI-100','qr',70000,null,0,5,'/products/minyak-kemirimurni.png'),
('Minyak Kemiri Hitam 100 ml','Hitam',100,'EYFA-HITAM-100','EYFA-EYFA-HITAM-100','qr',70000,null,0,5,'/products/minyak-kemirihitam.png')
on conflict(sku) do nothing;
