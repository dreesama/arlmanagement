import React from 'react';
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  UserCheck,
  Users,
  CreditCard,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { User } from '../../types';
import { Logo } from '../ui/Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  currentUser,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rooms', label: 'Room Management', icon: BedDouble },
    { id: 'reservations', label: 'Reservations', icon: CalendarCheck },
    { id: 'checkinout', label: 'Check-In / Out', icon: UserCheck },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'billing', label: 'Billing & Payment', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-[#E5E0D8] transition-all duration-200 ease-out flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header with LOGO.svg */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#E5E0D8]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <Logo size={28} />
            <div>
              <h1 className="text-sm font-bold text-[#1C1B18] tracking-tight leading-none">ARL's Hotel</h1>
              <span className="text-[10px] text-[#6E6B65] font-medium">Hotel Management</span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto">
            <Logo size={24} />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded text-[#6E6B65] hover:text-[#1C1B18] hover:bg-[#F5F2EC] hidden md:flex items-center justify-center border border-[#E5E0D8]"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all group ${
                isActive
                  ? 'bg-[#C84B31] text-white shadow-xs'
                  : 'text-[#1C1B18] hover:text-[#1C1B18] hover:bg-[#F5F2EC]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#6E6B65] group-hover:text-[#C84B31]'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-[#E5E0D8] bg-[#F5F2EC]/50">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white border border-[#E5E0D8] flex items-center justify-center text-xs font-bold text-[#C84B31] shrink-0">
                {currentUser?.fullName?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1C1B18] truncate">{currentUser?.fullName || 'Administrator'}</div>
                <div className="text-[10px] text-[#6E6B65] truncate">{currentUser?.role || 'Admin'}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded text-[#6E6B65] hover:text-[#C84B31] hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="w-full py-2 flex justify-center text-[#6E6B65] hover:text-[#C84B31] hover:bg-rose-50 rounded transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
