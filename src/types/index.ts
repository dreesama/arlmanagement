export type RoomType = 'Standard' | 'Deluxe' | 'Suite' | 'Presidential';
export type RoomStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';

export interface Room {
  id: number;
  number: string;
  floor: number;
  type: RoomType;
  bedType: string;
  capacity: number;
  ratePerNight: number;
  status: RoomStatus;
  amenities: string[];
  description?: string;
  image?: string;
}

export interface Guest {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  idType: string;
  idNumber: string;
  address: string;
  nationality: string;
  isVip: boolean;
  notes?: string;
  createdAt: string;
}

export type ReservationStatus = 'Pending' | 'Confirmed' | 'Checked-In' | 'Checked-Out' | 'Cancelled';

export interface Reservation {
  id: number;
  reservationCode: string;
  guestId: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  roomId: number;
  roomNumber?: string;
  roomType?: RoomType;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  totalAmount: number;
  specialRequests?: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'Credit Card' | 'GCash' | 'Bank Transfer';
export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

export interface BillingItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Billing {
  id: number;
  invoiceNumber: string;
  reservationId: number;
  guestName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  roomCharges: number;
  extraCharges: number;
  subtotal: number;
  taxAmount: number; // 12% VAT
  serviceCharge: number; // 10%
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  status: PaymentStatus;
  createdAt: string;
  items: BillingItem[];
  payments: Payment[];
}

export interface Payment {
  id: number;
  billingId: number;
  amount: number;
  method: PaymentMethod;
  referenceNo?: string;
  paidAt: string;
  notes?: string;
}

export interface DashboardStats {
  occupancyRate: number;
  availableRooms: number;
  totalRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  maintenanceRooms: number;
  todayRevenue: number;
  monthlyRevenue: number;
  activeReservationsCount: number;
  todayArrivalsCount: number;
  todayDeparturesCount: number;
  recentReservations: Reservation[];
  monthlyRevenueData: { month: string; revenue: number; bookings: number }[];
  occupancyTrendData: { date: string; occupancyRate: number }[];
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'Admin' | 'Manager' | 'Receptionist';
}
