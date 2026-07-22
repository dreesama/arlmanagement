import React, { useEffect, useState } from 'react';
import {
  BedDouble,
  CalendarCheck,
  TrendingUp,
  Percent,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { DashboardStats } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getReservationStatusBadge } from '../lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-8 text-center text-[#6E6B65] flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-7 h-7 border-2 border-[#C84B31] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Actions */}
      <div className="zen-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B18] tracking-tight">Hotel Operational Summary</h2>
          <p className="text-xs text-[#6E6B65] mt-0.5 font-medium">
            Today: <span className="text-[#C84B31] font-bold">{stats.todayArrivalsCount} Arrivals</span> •{' '}
            <span className="text-[#9A6208] font-bold">{stats.todayDeparturesCount} Departures</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('reservations')}
            className="px-4 py-2 zen-btn-primary text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> New Reservation
          </button>
          <button
            onClick={() => onNavigate('checkinout')}
            className="px-4 py-2 zen-btn text-xs font-bold flex items-center gap-2 border border-[#E5E0D8] transition-all"
          >
            Check-In Desk <ArrowUpRight className="w-3.5 h-3.5 text-[#6E6B65]" />
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          change="+4.2%"
          isPositive={true}
          icon={Percent}
          description={`${stats.occupiedRooms} occupied out of ${stats.totalRooms} rooms`}
        />
        <StatCard
          title="Available Rooms"
          value={stats.availableRooms}
          icon={BedDouble}
          description={`${stats.reservedRooms} reserved, ${stats.maintenanceRooms} maintenance`}
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          change="+12.5%"
          isPositive={true}
          icon={TrendingUp}
          description={`Monthly: ${formatCurrency(stats.monthlyRevenue)}`}
        />
        <StatCard
          title="Active Reservations"
          value={stats.activeReservationsCount}
          icon={CalendarCheck}
          description="Confirmed & Checked-In guests"
        />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="zen-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1C1B18]">Monthly Revenue (₱)</h3>
              <p className="text-[11px] text-[#6E6B65] font-medium">Revenue performance over the last 6 months</p>
            </div>
            <span className="text-xs text-[#C84B31] font-bold px-2.5 py-1 rounded bg-[#F5F2EC] border border-[#E5E0D8]">
              YTD 2026
            </span>
          </div>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyRevenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" vertical={false} />
                <XAxis dataKey="month" stroke="#6E6B65" fontSize={11} tickLine={false} />
                <YAxis stroke="#6E6B65" fontSize={11} tickLine={false} tickFormatter={(val) => `₱${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8', borderRadius: '8px', color: '#1C1B18', boxShadow: '0 4px 6px -1px rgba(28, 27, 24, 0.05)' }}
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#C84B31" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Rate Trend Line Chart */}
        <div className="zen-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1C1B18]">Occupancy Rate Trend (%)</h3>
              <p className="text-[11px] text-[#6E6B65] font-medium">7-day daily occupancy percentage</p>
            </div>
            <span className="text-xs text-[#2D5A39] font-bold px-2.5 py-1 rounded bg-[#EBF5EF] border border-[#BCE3C8]">
              Avg: 78%
            </span>
          </div>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.occupancyTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" vertical={false} />
                <XAxis dataKey="date" stroke="#6E6B65" fontSize={11} tickLine={false} />
                <YAxis stroke="#6E6B65" fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8', borderRadius: '8px', color: '#1C1B18', boxShadow: '0 4px 6px -1px rgba(28, 27, 24, 0.05)' }}
                  formatter={(val: any) => [`${val}%`, 'Occupancy']}
                />
                <Line type="monotone" dataKey="occupancyRate" stroke="#4A7C59" strokeWidth={2.5} dot={{ fill: '#4A7C59', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Room Status Summary Bar */}
      <div className="zen-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#6E6B65]">Inventory Distribution:</div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EBF5EF] text-[#2D5A39] border border-[#BCE3C8] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-bold">{stats.availableRooms}</span> Available
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EEF2F6] text-[#2C4366] border border-[#C3D2E5] font-semibold">
            <BedDouble className="w-3.5 h-3.5" />
            <span className="font-bold">{stats.occupiedRooms}</span> Occupied
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FEF7EC] text-[#9A6208] border border-[#FCE1B6] font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{stats.reservedRooms}</span> Reserved
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FDF2F0] text-[#992E1B] border border-[#F8C8C1] font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-bold">{stats.maintenanceRooms}</span> Maintenance
          </div>
        </div>
      </div>

      {/* Recent Reservations Table */}
      <div className="zen-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E0D8] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1C1B18]">Recent Bookings & Activity</h3>
            <p className="text-[11px] text-[#6E6B65] font-medium">Latest reservations registered in system</p>
          </div>
          <button
            onClick={() => onNavigate('reservations')}
            className="text-xs text-[#C84B31] hover:underline font-bold flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1B18]">
            <thead className="bg-[#F5F2EC] text-[#6E6B65] font-bold border-b border-[#E5E0D8]">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Guest Name</th>
                <th className="px-5 py-3">Room</th>
                <th className="px-5 py-3">Dates</th>
                <th className="px-5 py-3">Total (₱)</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              {stats.recentReservations.map((res) => (
                <tr key={res.id} className="hover:bg-[#F5F2EC]/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-[#C84B31]">{res.reservationCode}</td>
                  <td className="px-5 py-3.5 font-bold text-[#1C1B18]">{res.guestName}</td>
                  <td className="px-5 py-3.5">
                    <span className="bg-white text-[#1C1B18] px-2 py-1 rounded text-[11px] font-semibold border border-[#E5E0D8]">
                      Room {res.roomNumber} ({res.roomType})
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#6E6B65] font-medium">
                    {formatDate(res.checkInDate)} → {formatDate(res.checkOutDate)} ({res.nights}n)
                  </td>
                  <td className="px-5 py-3.5 font-bold text-[#1C1B18]">{formatCurrency(res.totalAmount)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getReservationStatusBadge(res.status)}`}>
                      {res.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
