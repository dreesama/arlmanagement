import React from 'react';
import { Search, Clock, Globe } from 'lucide-react';
import { User } from '../../types';
import { Logo } from '../ui/Logo';

interface HeaderProps {
  activeTab: string;
  currentUser: User | null;
  onGoToGuest?: () => void;
}

const tabTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard Overview', subtitle: 'Real-time metrics, room occupancy, and revenue analytics' },
  rooms: { title: 'Room Management', subtitle: 'Manage room inventory, pricing, types, and operational statuses' },
  reservations: { title: 'Reservation Management', subtitle: 'Create, modify, and track guest bookings & stay schedules' },
  checkinout: { title: 'Check-In & Check-Out Desk', subtitle: 'Process daily guest arrivals, departures, and key issuance' },
  guests: { title: 'Guest Directory', subtitle: 'Guest profiles, stay history, contact records, and VIP tags' },
  billing: { title: 'Billing & Payments', subtitle: 'Invoice computation, tax/service fee processing, and payments' },
  reports: { title: 'Analytics & Reports', subtitle: 'Daily bookings, monthly revenue breakdown, and occupancy trends' },
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onGoToGuest }) => {
  const current = tabTitles[activeTab] || { title: 'ARL\'s Hotel', subtitle: 'Management System' };
  const currentTime = new Date().toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-[#E5E0D8] px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3">
        <Logo size={24} />
        <div>
          <h2 className="text-sm font-bold text-[#1C1B18]">{current.title}</h2>
          <p className="text-[11px] text-[#6E6B65] hidden sm:block font-medium">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onGoToGuest && (
          <button
            onClick={onGoToGuest}
            className="px-3 py-1.5 zen-btn text-xs font-bold flex items-center gap-1.5 transition-all text-[#C84B31] hover:text-[#B43F27]"
            title="Switch to Public Guest Landing Page"
          >
            <Globe className="w-3.5 h-3.5" /> Public Guest Site ↗
          </button>
        )}

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5F2EC] border border-[#E5E0D8] text-xs font-semibold text-[#1C1B18]">
          <Clock className="w-3.5 h-3.5 text-[#6E6B65]" />
          <span>{currentTime}</span>
        </div>

        {/* Zen Search Bar */}
        <div className="relative hidden lg:block w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6B65]" />
          <input
            type="text"
            placeholder="Search system..."
            className="w-full pl-9 pr-3 py-1.5 zen-input text-xs text-[#1C1B18] placeholder-[#6E6B65]"
          />
        </div>
      </div>
    </header>
  );
};
