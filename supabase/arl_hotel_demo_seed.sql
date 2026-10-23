-- Fictional content for the public simulation. All names and email addresses are invented.
INSERT INTO public.rooms (number,floor,type,"bedType",capacity,"ratePerNight",status,amenities,description,image)
VALUES
('101',1,'Standard','Queen',2,2500,'Occupied',ARRAY['WiFi','AC','Smart TV','Mini Fridge'],'Demo standard suite','https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'),
('102',1,'Standard','Queen',2,2500,'Reserved',ARRAY['WiFi','AC','Smart TV'],'Demo standard queen room','https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'),
('103',1,'Standard','Twin',2,2400,'Available',ARRAY['WiFi','AC','Smart TV'],'Demo standard twin room','https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80'),
('201',2,'Deluxe','King',3,4500,'Available',ARRAY['WiFi','AC','Balcony'],'Demo deluxe king room','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'),
('202',2,'Deluxe','King',3,4500,'Available',ARRAY['WiFi','AC','Bathtub'],'Demo deluxe suite','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'),
('203',2,'Deluxe','Queen Twin',4,4800,'Available',ARRAY['WiFi','AC','Mini Bar'],'Demo family deluxe room','https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80'),
('301',3,'Suite','King Executive',4,8500,'Available',ARRAY['WiFi','Jacuzzi','Living Room'],'Demo executive suite','https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'),
('302',3,'Suite','King Executive',4,8500,'Maintenance',ARRAY['WiFi','Jacuzzi'],'Demo suite temporarily under maintenance','https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80'),
('401',4,'Presidential','Super King',6,18000,'Available',ARRAY['Butler Service','Private Pool','Kitchenette'],'Demo presidential suite','https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80')
ON CONFLICT(number) DO NOTHING;

DO $seed$
DECLARE g1 bigint; g2 bigint; room1 bigint; room2 bigint; rid1 bigint; rid2 bigint; bid1 bigint; bid2 bigint;
DECLARE t text:=to_char(now() at time zone 'Asia/Manila','YYYY-MM-DD');
DECLARE tomorrow text:=to_char((now() at time zone 'Asia/Manila') + interval '1 day','YYYY-MM-DD');
DECLARE after2 text:=to_char((now() at time zone 'Asia/Manila') + interval '2 days','YYYY-MM-DD');
DECLARE yesterday text:=to_char((now() at time zone 'Asia/Manila') - interval '1 day','YYYY-MM-DD');
BEGIN
 IF EXISTS(SELECT 1 FROM public.guests) THEN RETURN; END IF;
 INSERT INTO public.guests ("fullName",email,phone,"idType","idNumber",address,nationality,"isVip",notes,"createdAt")
 VALUES ('Alex Example','alex@example.invalid','000-0000','Demo ID','DEMO-001','Fictional demo address','Filipino',true,'Sample guest only',t)
 RETURNING id INTO g1;
 INSERT INTO public.guests ("fullName",email,phone,"idType","idNumber",address,nationality,"isVip",notes,"createdAt")
 VALUES ('Sam Test','sam@example.invalid','000-0000','Demo ID','DEMO-002','Fictional demo address','Filipino',false,'Sample guest only',t)
 RETURNING id INTO g2;
 INSERT INTO public.guests ("fullName",email,phone,"idType","idNumber",address,nationality,"isVip",notes,"createdAt")
 VALUES ('Jordan Sample','jordan@example.invalid','000-0000','Demo ID','DEMO-003','Fictional demo address','Filipino',false,'Sample guest only',t);
 SELECT id INTO room1 FROM public.rooms WHERE number='101';
 SELECT id INTO room2 FROM public.rooms WHERE number='102';
 INSERT INTO public.reservations ("reservationCode","guestId","roomId","checkInDate","checkOutDate",nights,adults,children,status,"totalAmount","specialRequests","actualCheckIn","createdAt")
 VALUES ('DEMO-BOOK-001',g1,room1,yesterday,tomorrow,2,2,0,'Checked-In',5000,'Late check-out example',yesterday,yesterday)
 RETURNING id INTO rid1;
 INSERT INTO public.reservations ("reservationCode","guestId","roomId","checkInDate","checkOutDate",nights,adults,children,status,"totalAmount","specialRequests","createdAt")
 VALUES ('DEMO-BOOK-002',g2,room2,t,after2,2,2,0,'Confirmed',5000,'Extra towels',t)
 RETURNING id INTO rid2;
 INSERT INTO public.billings ("invoiceNumber","reservationId","roomCharges",subtotal,"taxAmount","serviceCharge","grandTotal","paidAmount","balanceAmount",status,"createdAt")
 VALUES('DEMO-INV-001',rid1,5000,5000,600,500,6100,2000,4100,'Partial',yesterday) RETURNING id INTO bid1;
 INSERT INTO public.billings ("invoiceNumber","reservationId","roomCharges",subtotal,"taxAmount","serviceCharge","grandTotal","paidAmount","balanceAmount",status,"createdAt")
 VALUES('DEMO-INV-002',rid2,5000,5000,600,500,6100,0,6100,'Unpaid',t) RETURNING id INTO bid2;
 INSERT INTO public.billing_items ("billingId",description,quantity,"unitPrice",amount)
 VALUES(bid1,'Room Charge (Room 101 - 2 nights)',2,2500,5000),
       (bid2,'Room Charge (Room 102 - 2 nights)',2,2500,5000);
 INSERT INTO public.payments ("billingId",amount,method,"referenceNo","paidAt",notes)
 VALUES(bid1,2000,'Cash','DEMO-PAY-001',t||' 10:00','Fictional partial payment');
END $seed$;
