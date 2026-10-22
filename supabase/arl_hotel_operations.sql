-- Transactional hotel operations. All functions run as the calling
-- authenticated user, and RLS continues to apply.
create or replace function public.update_hotel_reservation_status(p_id bigint, p_action text)
returns void language plpgsql security invoker set search_path = ''
as $$
declare r public.reservations%rowtype;
begin
 if not private.is_arl_admin() then raise exception 'Not authorized'; end if;
 select * into r from public.reservations where id=p_id for update;
 if not found then raise exception 'Reservation not found'; end if;
 if p_action='cancel' and r.status in ('Confirmed','Pending') then
   update public.reservations set status='Cancelled' where id=p_id;
   update public.rooms set status='Available' where id=r."roomId";
 elsif p_action='checkin' and r.status='Confirmed' then
   update public.reservations set status='Checked-In',"actualCheckIn"=to_char(now() at time zone 'UTC','YYYY-MM-DD') where id=p_id;
   update public.rooms set status='Occupied' where id=r."roomId";
 elsif p_action='checkout' and r.status='Checked-In' then
   update public.reservations set status='Checked-Out',"actualCheckOut"=to_char(now() at time zone 'UTC','YYYY-MM-DD') where id=p_id;
   update public.rooms set status='Available' where id=r."roomId";
 else raise exception 'Action not permitted for reservation status %',r.status;
 end if;
end $$;
revoke all on function public.update_hotel_reservation_status(bigint,text) from public,anon;
grant execute on function public.update_hotel_reservation_status(bigint,text) to authenticated;

create or replace function public.extend_hotel_reservation(
  p_id bigint, p_nights integer, p_new_checkout text default null)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare r public.reservations%rowtype; room_rate numeric; bill public.billings%rowtype;
declare added numeric; new_subtotal numeric; new_tax numeric; new_service numeric;
declare new_total numeric; new_balance numeric; new_end text;
begin
 if not private.is_arl_admin() then raise exception 'Not authorized'; end if;
 if p_nights is null or p_nights < 1 then raise exception 'Invalid additional nights'; end if;
 select * into r from public.reservations where id=p_id for update;
 if not found or r.status not in ('Confirmed','Checked-In') then raise exception 'Reservation cannot be extended'; end if;
 select "ratePerNight" into room_rate from public.rooms where id=r."roomId";
 select * into bill from public.billings where "reservationId"=p_id for update;
 if not found then raise exception 'Billing not found'; end if;
 added := room_rate * p_nights;
 new_end := coalesce(p_new_checkout, to_char(to_date(r."checkOutDate",'YYYY-MM-DD')+p_nights,'YYYY-MM-DD'));
 if new_end <= r."checkOutDate" then raise exception 'Checkout must be later'; end if;
 update public.reservations set nights=r.nights+p_nights, "checkOutDate"=new_end,
   "totalAmount"=r."totalAmount"+added where id=p_id;
 insert into public.billing_items ("billingId",description,quantity,"unitPrice",amount)
   values (bill.id,'Room extension ('||p_nights||' night/s)',p_nights,room_rate,added);
 new_subtotal:=bill.subtotal+added;
 new_tax:=round(greatest(0,new_subtotal-bill."discountAmount")*0.12,2);
 new_service:=round(greatest(0,new_subtotal-bill."discountAmount")*0.10,2);
 new_total:=greatest(0,new_subtotal-bill."discountAmount")+new_tax+new_service;
 new_balance:=greatest(0,new_total-bill."paidAmount");
 update public.billings set "roomCharges"=bill."roomCharges"+added,subtotal=new_subtotal,
   "taxAmount"=new_tax,"serviceCharge"=new_service,"grandTotal"=new_total,
   "balanceAmount"=new_balance,status=case when new_balance=0 then 'Paid'
     when bill."paidAmount">0 then 'Partial' else 'Unpaid' end where id=bill.id;
 return jsonb_build_object('success',true,'reservation',jsonb_build_object('id',p_id),'addedNights',p_nights,'extensionCharge',added);
end $$;
revoke all on function public.extend_hotel_reservation(bigint,integer,text) from public,anon;
grant execute on function public.extend_hotel_reservation(bigint,integer,text) to authenticated;

create or replace function public.update_hotel_billing(
  p_id bigint, p_discount_type text, p_discount_value numeric, p_items jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare bill public.billings%rowtype; elem jsonb;
declare rc numeric:=0; ec numeric:=0; subtotal numeric; dis numeric;
declare taxable numeric; tax numeric; svc numeric; grand numeric; bal numeric;
declare descr text; qty numeric; unit numeric; amt numeric;
begin
 if not private.is_arl_admin() then raise exception 'Not authorized'; end if;
 if p_discount_type not in ('percentage','fixed') or p_discount_value < 0 or p_discount_value is null then raise exception 'Invalid discount'; end if;
 if p_discount_type='percentage' and p_discount_value>100 then raise exception 'Discount exceeds allowed percentage'; end if;
 if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)>100 then raise exception 'Invalid line items'; end if;
 select * into bill from public.billings where id=p_id for update;
 if not found then raise exception 'Billing not found'; end if;
 delete from public.billing_items where "billingId"=p_id;
 for elem in select value from jsonb_array_elements(p_items) loop
  descr:=left(coalesce(elem->>'description',''),255);
  qty:=(elem->>'quantity')::numeric; unit:=(elem->>'unitPrice')::numeric;
  if descr='' or qty<=0 or unit<0 then raise exception 'Invalid line item'; end if;
  amt:=round(qty*unit,2);
  insert into public.billing_items ("billingId",description,quantity,"unitPrice",amount)
  values(p_id,descr,qty,unit,amt);
  if position('room charge' in lower(descr))>0 then rc:=rc+amt; else ec:=ec+amt; end if;
 end loop;
 subtotal:=rc+ec;
 dis:=case when p_discount_type='percentage' then round(subtotal*p_discount_value/100,2)
 else least(subtotal,p_discount_value) end;
 taxable:=greatest(0,subtotal-dis);
 tax:=round(taxable*0.12,2); svc:=round(taxable*0.10,2); grand:=taxable+tax+svc;
 bal:=greatest(0,grand-bill."paidAmount");
 update public.billings set "roomCharges"=rc,"extraCharges"=ec,subtotal=subtotal,"discountAmount"=dis,
 "discountType"=p_discount_type,"discountValue"=p_discount_value,"taxAmount"=tax,
 "serviceCharge"=svc,"grandTotal"=grand,"balanceAmount"=bal,
 status=case when bal=0 and grand>0 then 'Paid' when bill."paidAmount">0 then 'Partial' else 'Unpaid' end where id=p_id;
end $$;
revoke all on function public.update_hotel_billing(bigint,text,numeric,jsonb) from public,anon;
grant execute on function public.update_hotel_billing(bigint,text,numeric,jsonb) to authenticated;

create or replace function public.record_hotel_payment(
 p_billing_id bigint, p_amount numeric,p_method text,p_reference text default '',p_notes text default '')
returns void language plpgsql security invoker set search_path = ''
as $$
declare b public.billings%rowtype; already numeric; remaining numeric;
begin
 if not private.is_arl_admin() then raise exception 'Not authorized'; end if;
 if p_amount is null or p_amount<=0 or p_method is null or length(trim(p_method))=0 then raise exception 'Invalid payment'; end if;
 select * into b from public.billings where id=p_billing_id for update;
 if not found then raise exception 'Billing not found'; end if;
 select coalesce(sum(amount),0) into already from public.payments where "billingId"=p_billing_id;
 if already+p_amount>b."grandTotal" then raise exception 'Payment exceeds outstanding balance'; end if;
 insert into public.payments ("billingId",amount,method,"referenceNo","paidAt",notes)
 values(p_billing_id,p_amount,p_method,coalesce(p_reference,''),to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI'),coalesce(p_notes,''));
 remaining:=greatest(0,b."grandTotal"-already-p_amount);
 update public.billings set "paidAmount"=already+p_amount,"balanceAmount"=remaining,
 status=case when remaining=0 then 'Paid' else 'Partial' end where id=p_billing_id;
end $$;
revoke all on function public.record_hotel_payment(bigint,numeric,text,text,text) from public,anon;
grant execute on function public.record_hotel_payment(bigint,numeric,text,text,text) to authenticated;
