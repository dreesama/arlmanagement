import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format Philippine Peso Currency (₱)
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₱0.00';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format Date string
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

// Format DateTime string
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

// Japandi Status Badges
export function getRoomStatusBadge(status: string) {
  switch (status) {
    case 'Available':
      return 'bg-[#EBF5EF] text-[#2D5A39] border-[#BCE3C8]';
    case 'Occupied':
      return 'bg-[#EEF2F6] text-[#2C4366] border-[#C3D2E5]';
    case 'Reserved':
      return 'bg-[#FEF7EC] text-[#9A6208] border-[#FCE1B6]';
    case 'Maintenance':
      return 'bg-[#FDF2F0] text-[#992E1B] border-[#F8C8C1]';
    default:
      return 'bg-[#F5F2EC] text-[#6E6B65] border-[#E5E0D8]';
  }
}

export function getReservationStatusBadge(status: string) {
  switch (status) {
    case 'Confirmed':
      return 'bg-[#EEF2F6] text-[#2C4366] border-[#C3D2E5]';
    case 'Checked-In':
      return 'bg-[#EBF5EF] text-[#2D5A39] border-[#BCE3C8]';
    case 'Checked-Out':
      return 'bg-[#F5F2EC] text-[#6E6B65] border-[#E5E0D8]';
    case 'Cancelled':
      return 'bg-[#FDF2F0] text-[#992E1B] border-[#F8C8C1]';
    case 'Pending':
      return 'bg-[#FEF7EC] text-[#9A6208] border-[#FCE1B6]';
    default:
      return 'bg-[#F5F2EC] text-[#6E6B65] border-[#E5E0D8]';
  }
}

export function getPaymentStatusBadge(status: string) {
  switch (status) {
    case 'Paid':
      return 'bg-[#EBF5EF] text-[#2D5A39] border-[#BCE3C8]';
    case 'Partial':
      return 'bg-[#FEF7EC] text-[#9A6208] border-[#FCE1B6]';
    case 'Unpaid':
      return 'bg-[#FDF2F0] text-[#992E1B] border-[#F8C8C1]';
    default:
      return 'bg-[#F5F2EC] text-[#6E6B65] border-[#E5E0D8]';
  }
}
