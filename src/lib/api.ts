import type { Room, Guest, Reservation, Billing, DashboardStats } from '../types';

// The publishable key is safe for the browser. Supabase RLS, not this key,
// protects hotel records. Do not ever put a service_role/secret key here.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://pttbuvsznkrifvtbbpkf.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_YMIT-OWTbo-8Ay12rjKTlg_AUgNUi_l';
const SESSION_KEY = 'arl_supabase_session';
type Session = { access_token: string; refresh_token: string; expires_at?: number; user?: { id: string; email?: string } };

function readSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}
function saveSession(s: Session | null) {
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION_KEY);
}
async function authRequest(endpoint: string, body: object) {
  const res = await fetch(URL + '/auth/v1/' + endpoint, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || data.error_description || data.message || 'Authentication failed');
  return data;
}
async function token(): Promise<string> {
  let s = readSession();
  if (!s) throw new Error('Please sign in again.');
  if (s.expires_at && s.expires_at < Date.now()/1000 + 60) {
    const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
    s = { ...refreshed, expires_at: Math.floor(Date.now()/1000) + refreshed.expires_in };
    saveSession(s);
  }
  return s!.access_token;
}
async function request<T>(resource: string, init: RequestInit = {}, options: { prefer?: string } = {}): Promise<T> {
  const access = await token();
  const res = await fetch(URL + '/rest/v1/' + resource, {
    ...init,
    headers: {
      apikey: KEY, Authorization: 'Bearer ' + access,
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...init.headers
    }
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.message || detail.hint || 'Request failed (' + res.status + ')');
  }
  if (res.status === 204) return undefined as T;
  return await res.json() as T;
}
const eq = (value: string | number) => 'eq.' + encodeURIComponent(String(value));
const query = (table: string, select = '*') => table + '?select=' + encodeURIComponent(select);
const order = (table: string, key = 'id', ascending = false) => query(table) + '&order=' + key + '.' + (ascending ? 'asc' : 'desc');
const today = () => new Date().toISOString().slice(0,10);
const month = () => today().slice(0,7);
const countMoney = (v: unknown) => Number(v || 0);
const fixRoom = (r: any): Room => ({...r, ratePerNight: countMoney(r.ratePerNight), amenities: Array.isArray(r.amenities) ? r.amenities : []});
const fixGuest = (g: any): Guest => ({...g, isVip: Boolean(g.isVip)});
const fixReservation = (r: any): Reservation => ({
  ...r, totalAmount: countMoney(r.totalAmount),
  guestName: r.guests?.fullName, guestEmail: r.guests?.email,
  guestPhone: r.guests?.phone, roomNumber: r.rooms?.number, roomType: r.rooms?.type
});
const fixBilling = (b: any): Billing => ({
  ...b, roomCharges: countMoney(b.roomCharges), extraCharges: countMoney(b.extraCharges),
  subtotal: countMoney(b.subtotal), taxAmount: countMoney(b.taxAmount), serviceCharge: countMoney(b.serviceCharge),
  discountAmount: countMoney(b.discountAmount), discountValue: countMoney(b.discountValue),
  grandTotal: countMoney(b.grandTotal), paidAmount: countMoney(b.paidAmount), balanceAmount: countMoney(b.balanceAmount),
  reservationCode: b.reservations?.reservationCode,
  guestName: b.reservations?.guests?.fullName || '',
  roomNumber: b.reservations?.rooms?.number || '',
  checkInDate: b.reservations?.checkInDate || '',
  checkOutDate: b.reservations?.checkOutDate || '',
  items: (b.billing_items || []).map((x:any)=>({...x, amount:countMoney(x.amount),unitPrice:countMoney(x.unitPrice)})),
  payments: (b.payments || []).map((x:any)=>({...x,amount:countMoney(x.amount)}))
});
const reservationSelect = '*,guests(fullName,email,phone),rooms(number,type)';
const billingSelect = '*,reservations(reservationCode,checkInDate,checkOutDate,guests(fullName),rooms(number)),billing_items(*),payments(*)';
async function insert<T>(table: string, value: object): Promise<T> {
  const records = await request<T[]>(query(table), { method:'POST', body:JSON.stringify(value) }, {prefer:'return=representation'});
  return records[0];
}
async function update<T>(table: string, id: number, values: object): Promise<T> {
  const records = await request<T[]>(query(table) + '&id=' + eq(id),
    {method:'PATCH',body:JSON.stringify(values)}, {prefer:'return=representation'});
  if (!records.length) throw new Error('Record not found');
  return records[0];
}
async function remove(table: string, id: number) {
  await request(table + '?id=' + eq(id), {method:'DELETE'}, {prefer:'return=minimal'});
}
async function rpc<T>(name: string, args: object = {}): Promise<T> {
  return request<T>('rpc/' + name, {method:'POST',body:JSON.stringify(args)});
}
export const api = {
  async login(credentials: { username: string; password: string }) {
    const email = credentials.username.trim().toLowerCase();
    if (!email.includes('@')) throw new Error('Use your authorized administrator email address.');
    const auth = await authRequest('token?grant_type=password', { email, password:credentials.password });
    const s: Session = { ...auth, expires_at: Math.floor(Date.now()/1000)+auth.expires_in };
    saveSession(s);
    try {
      const allowed = await rpc<boolean>('is_authorized_admin');
      if (!allowed) throw new Error('Your email has not been approved as a hotel administrator.');
      return { success: true, user: { id: 1, username:email, fullName:email, role:'Admin' as const } };
    } catch(e) { saveSession(null); throw e; }
  },
  async register(email: string, password: string) {
    await authRequest('signup', { email:email.toLowerCase().trim(),password });
    return {message:'Account registration submitted. Check your email for confirmation, then sign in.'};
  },
  async restoreSession() {
    if (!readSession()) return null;
    try {
      const allowed = await rpc<boolean>('is_authorized_admin');
      if (!allowed) {saveSession(null);return null;}
      const s=readSession();
      const email=s?.user?.email || 'admin';
      return { id:1,username:email,fullName:email,role:'Admin' as const };
    }catch{return null;}
  },
  async logout() {
    const s=readSession();
    if(s){try{await fetch(URL+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.access_token}});}catch{/*clear locally*/}}
    saveSession(null);
  },
  async getRooms(): Promise<Room[]> { return (await request<any[]>(order('rooms','number',true))).map(fixRoom); },
  async createRoom(room: Partial<Room>): Promise<Room> {return fixRoom(await insert('rooms',room));},
  async updateRoom(id: number,room:Partial<Room>):Promise<Room>{return fixRoom(await update('rooms',id,room));},
  async updateRoomStatus(id:number,status:string){await update('rooms',id,{status});return {success:true};},
  async deleteRoom(id:number){await remove('rooms',id);return {success:true};},
  async getGuests():Promise<Guest[]>{return (await request<any[]>(order('guests'))).map(fixGuest);},
  async createGuest(guest:Partial<Guest>):Promise<Guest>{return fixGuest(await insert('guests',{...guest,createdAt:today()}));},
  async updateGuest(id:number,guest:Partial<Guest>):Promise<Guest>{return fixGuest(await update('guests',id,guest));},
  async deleteGuest(id:number){await remove('guests',id);return {success:true};},
  async getReservations():Promise<Reservation[]>{
    return (await request<any[]>(query('reservations',reservationSelect)+'&order=id.desc')).map(fixReservation);
  },
  async createReservation(value:Partial<Reservation>):Promise<Reservation>{
    const rid=await rpc<number>('create_hotel_reservation',{
      p_guest_id:value.guestId,p_room_id:value.roomId,p_checkin:value.checkInDate,p_checkout:value.checkOutDate,
      p_nights:value.nights,p_adults:value.adults,p_children:value.children||0,p_special:value.specialRequests||''
    });
    return fixReservation((await request<any[]>(query('reservations',reservationSelect)+'&id='+eq(rid)))[0]);
  },
  async updateReservation(id:number,value:Partial<Reservation>):Promise<Reservation>{
    const {roomId,checkInDate,checkOutDate,nights,adults,children,status,specialRequests}=value;
    const rate=roomId ? (await request<any[]>(query('rooms','ratePerNight')+'&id='+eq(roomId)))[0] : null;
    const totalAmount=rate ? countMoney(rate.ratePerNight)*(nights||1) : undefined;
    return fixReservation(await update('reservations',id,{roomId,checkInDate,checkOutDate,nights,adults,children,status,specialRequests,totalAmount}));
  },
  async cancelReservation(id:number) {await rpc('update_hotel_reservation_status',{p_id:id,p_action:'cancel'});return {success:true};},
  async checkInReservation(id:number){await rpc('update_hotel_reservation_status',{p_id:id,p_action:'checkin'});return {success:true,checkInTime:today()};},
  async checkOutReservation(id:number){await rpc('update_hotel_reservation_status',{p_id:id,p_action:'checkout'});return {success:true,checkOutTime:today()};},
  async extendReservation(id:number,data:{additionalNights:number;newCheckOutDate?:string}){
    return rpc<{success:true;reservation:Reservation;addedNights:number;extensionCharge:number}>('extend_hotel_reservation',{
      p_id:id,p_nights:data.additionalNights,p_new_checkout:data.newCheckOutDate || null
    });
  },
  async getBillings():Promise<Billing[]> {
    return (await request<any[]>(query('billings',billingSelect)+'&order=id.desc')).map(fixBilling);
  },
  async getBillingById(id:number):Promise<Billing>{
    const rows=await request<any[]>(query('billings',billingSelect)+'&id='+eq(id));
    if(!rows.length)throw new Error('Billing not found');
    return fixBilling(rows[0]);
  },
  async updateBilling(id:number,data:{discountType:string;discountValue:number;items:any[]}):Promise<Billing>{
    await rpc('update_hotel_billing',{p_id:id,p_discount_type:data.discountType,p_discount_value:data.discountValue,p_items:data.items});
    return this.getBillingById(id);
  },
  async recordPayment(id:number,payment:{amount:number;method:string;referenceNo?:string;notes?:string}){
    await rpc('record_hotel_payment',{p_billing_id:id,p_amount:payment.amount,p_method:payment.method,p_reference:payment.referenceNo||'',p_notes:payment.notes||''});
    return {success:true};
  },
  async getDashboardStats():Promise<DashboardStats>{
    const [rooms,reservations,billings]=await Promise.all([this.getRooms(),this.getReservations(),this.getBillings()]);
    const t=today(), m=month(), totalRooms=rooms.length, occupiedRooms=rooms.filter(x=>x.status==='Occupied').length;
    const payments=billings.flatMap(b=>b.payments);
    const recentReservations=reservations.slice(0,5);
    return {
      totalRooms,occupiedRooms,availableRooms:rooms.filter(x=>x.status==='Available').length,
      reservedRooms:rooms.filter(x=>x.status==='Reserved').length,
      maintenanceRooms:rooms.filter(x=>x.status==='Maintenance').length,
      occupancyRate:totalRooms?Math.round(100*occupiedRooms/totalRooms):0,
      todayRevenue:payments.filter(p=>p.paidAt.startsWith(t)).reduce((a,p)=>a+countMoney(p.amount),0),
      monthlyRevenue:payments.filter(p=>p.paidAt.startsWith(m)).reduce((a,p)=>a+countMoney(p.amount),0),
      activeReservationsCount:reservations.filter(r=>r.status==='Confirmed'||r.status==='Checked-In').length,
      todayArrivalsCount:reservations.filter(r=>r.checkInDate===t&&r.status!=='Cancelled').length,
      todayDeparturesCount:reservations.filter(r=>r.checkOutDate===t&&r.status!=='Cancelled').length,
      recentReservations,
      monthlyRevenueData:[], occupancyTrendData:[]
    };
  },
  async getDailyReport(date?:string) {
    const d=date||today(), bookings=(await this.getReservations()).filter(r=>r.createdAt.startsWith(d));
    return {date:d,totalBookings:bookings.length,totalRevenue:bookings.reduce((a,r)=>a+countMoney(r.totalAmount),0),bookings};
  },
  async getMonthlyReport(monthValue?:string){
    const m=monthValue||month(),billings=(await this.getBillings()).filter(b=>b.createdAt.startsWith(m));
    const roomTypeRevenue:Record<string,number>={};
    return {month:m,totalRevenue:billings.reduce((a,b)=>a+countMoney(b.grandTotal),0),
      paidRevenue:billings.reduce((a,b)=>a+countMoney(b.paidAmount),0),
      pendingRevenue:billings.reduce((a,b)=>a+countMoney(b.balanceAmount),0),roomTypeRevenue,billings};
  },
  async getOccupancyReport() {
    const rooms=await this.getRooms(),byType:Record<string,{total:number;occupied:number;reserved:number;available:number}>={};
    for(const r of rooms){
      const v=byType[r.type] ||= {total:0,occupied:0,reserved:0,available:0};
      v.total++;
      if(r.status==='Occupied')v.occupied++;
      if(r.status==='Reserved')v.reserved++;
      if(r.status==='Available')v.available++;
    }
    return {totalRooms:rooms.length,byType,rooms};
  }
};
