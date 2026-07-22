import { Room, Guest, Reservation, Billing, DashboardStats } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `API Error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (credentials: any) => fetchJson<{ success: boolean; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  // Dashboard
  getDashboardStats: () => fetchJson<DashboardStats>('/dashboard/stats'),

  // Rooms
  getRooms: () => fetchJson<Room[]>('/rooms'),
  createRoom: (room: Partial<Room>) => fetchJson<Room>('/rooms', { method: 'POST', body: JSON.stringify(room) }),
  updateRoom: (id: number, room: Partial<Room>) => fetchJson<Room>(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(room) }),
  updateRoomStatus: (id: number, status: string) => fetchJson<{ success: boolean }>(`/rooms/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteRoom: (id: number) => fetchJson<{ success: boolean }>(`/rooms/${id}`, { method: 'DELETE' }),

  // Guests
  getGuests: () => fetchJson<Guest[]>('/guests'),
  createGuest: (guest: Partial<Guest>) => fetchJson<Guest>('/guests', { method: 'POST', body: JSON.stringify(guest) }),
  updateGuest: (id: number, guest: Partial<Guest>) => fetchJson<Guest>(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(guest) }),
  deleteGuest: (id: number) => fetchJson<{ success: boolean }>(`/guests/${id}`, { method: 'DELETE' }),

  // Reservations
  getReservations: () => fetchJson<Reservation[]>('/reservations'),
  createReservation: (res: Partial<Reservation>) => fetchJson<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(res) }),
  updateReservation: (id: number, res: Partial<Reservation>) => fetchJson<Reservation>(`/reservations/${id}`, { method: 'PUT', body: JSON.stringify(res) }),
  cancelReservation: (id: number) => fetchJson<{ success: boolean }>(`/reservations/${id}/cancel`, { method: 'PATCH' }),
  checkInReservation: (id: number) => fetchJson<{ success: boolean; checkInTime: string }>(`/reservations/${id}/checkin`, { method: 'POST' }),
  checkOutReservation: (id: number) => fetchJson<{ success: boolean; checkOutTime: string }>(`/reservations/${id}/checkout`, { method: 'POST' }),

  // Billings
  getBillings: () => fetchJson<Billing[]>('/billings'),
  getBillingById: (id: number) => fetchJson<Billing>(`/billings/${id}`),
  updateBilling: (id: number, data: { discountType: string; discountValue: number; items: any[] }) => fetchJson<Billing>(`/billings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recordPayment: (id: number, payment: { amount: number; method: string; referenceNo?: string; notes?: string }) => fetchJson<{ success: boolean }>(`/billings/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),

  // Reports
  getDailyReport: (date?: string) => fetchJson<any>(`/reports/daily${date ? `?date=${date}` : ''}`),
  getMonthlyReport: (month?: string) => fetchJson<any>(`/reports/monthly${month ? `?month=${month}` : ''}`),
  getOccupancyReport: () => fetchJson<any>('/reports/occupancy'),
};
