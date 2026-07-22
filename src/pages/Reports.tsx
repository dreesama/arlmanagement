import React, { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportElementToPDF, exportToExcel } from '../utils/exports';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'occupancy'>('daily');

  // Daily Report State
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState<any>(null);

  // Monthly Report State
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().toISOString().substring(0, 7));
  const [monthlyData, setMonthlyData] = useState<any>(null);

  // Occupancy Report State
  const [occupancyData, setOccupancyData] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'daily') loadDailyReport();
    else if (activeTab === 'monthly') loadMonthlyReport();
    else if (activeTab === 'occupancy') loadOccupancyReport();
  }, [activeTab, dailyDate, monthlyMonth]);

  const loadDailyReport = async () => {
    setLoading(true);
    try {
      const data = await api.getDailyReport(dailyDate);
      setDailyData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const data = await api.getMonthlyReport(monthlyMonth);
      setMonthlyData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadOccupancyReport = async () => {
    setLoading(true);
    try {
      const data = await api.getOccupancyReport();
      setOccupancyData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDailyExcel = () => {
    if (!dailyData || !dailyData.bookings) return;
    const dataToExport = dailyData.bookings.map((b: any) => ({
      'Reservation Code': b.reservationCode,
      Guest: b.guestName,
      Room: `${b.roomNumber} (${b.roomType})`,
      'Check-In': b.checkInDate,
      'Check-Out': b.checkOutDate,
      Nights: b.nights,
      'Total (PHP)': b.totalAmount,
      Status: b.status,
    }));
    exportToExcel(dataToExport, `ARL_Daily_Bookings_${dailyDate}`);
  };

  const handleExportMonthlyExcel = () => {
    if (!monthlyData || !monthlyData.billings) return;
    const dataToExport = monthlyData.billings.map((b: any) => ({
      'Invoice #': b.invoiceNumber,
      'Reservation Code': b.reservationCode,
      Guest: b.guestName,
      'Room Type': b.roomType,
      'Grand Total (PHP)': b.grandTotal,
      Paid: b.paidAmount,
      Balance: b.balanceAmount,
      Status: b.status,
    }));
    exportToExcel(dataToExport, `ARL_Monthly_Revenue_${monthlyMonth}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="zen-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B18] tracking-tight">Analytical & Financial Reports</h2>
          <p className="text-xs text-[#6E6B65] font-medium">Generate comprehensive operational and revenue statements</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#E5E0D8] pb-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'daily'
              ? 'bg-[#C84B31] text-white shadow-xs'
              : 'text-[#6E6B65] hover:text-[#1C1B18] hover:bg-[#F5F2EC]'
          }`}
        >
          Daily Bookings Report
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'monthly'
              ? 'bg-[#C84B31] text-white shadow-xs'
              : 'text-[#6E6B65] hover:text-[#1C1B18] hover:bg-[#F5F2EC]'
          }`}
        >
          Monthly Revenue Report
        </button>
        <button
          onClick={() => setActiveTab('occupancy')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'occupancy'
              ? 'bg-[#C84B31] text-white shadow-xs'
              : 'text-[#6E6B65] hover:text-[#1C1B18] hover:bg-[#F5F2EC]'
          }`}
        >
          Occupancy & Inventory Analytics
        </button>
      </div>

      {/* TAB 1: DAILY BOOKINGS REPORT */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="zen-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#1C1B18] font-bold">Select Date:</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="zen-input px-3 py-1.5 text-xs text-[#1C1B18] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDailyExcel}
                className="px-3.5 py-1.5 zen-btn text-xs font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-[#6E6B65]" /> Export Excel
              </button>
              <button
                onClick={() => exportElementToPDF('daily-report-view', `Daily_Report_${dailyDate}`)}
                className="px-3.5 py-1.5 zen-btn-primary text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <FileText className="w-4 h-4" /> PDF Report
              </button>
            </div>
          </div>

          <div id="daily-report-view" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="zen-card p-5">
                <div className="text-xs font-semibold uppercase text-[#6E6B65]">Total Bookings Created on {formatDate(dailyDate)}</div>
                <div className="text-2xl font-bold text-[#1C1B18] mt-1">{dailyData?.totalBookings || 0}</div>
              </div>
              <div className="zen-card p-5">
                <div className="text-xs font-semibold uppercase text-[#6E6B65]">Total Revenue Generated</div>
                <div className="text-2xl font-bold text-[#C84B31] mt-1">{formatCurrency(dailyData?.totalRevenue || 0)}</div>
              </div>
            </div>

            {/* Daily Table Container */}
            <div className="zen-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E0D8]">
                <h3 className="text-sm font-bold text-[#1C1B18]">Reservations Created on {formatDate(dailyDate)}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#1C1B18] table-fixed">
                  <thead className="bg-[#F5F2EC] text-[#6E6B65] font-bold border-b border-[#E5E0D8]">
                    <tr>
                      <th className="px-5 py-3.5 w-32">Code</th>
                      <th className="px-5 py-3.5 w-48">Guest Name</th>
                      <th className="px-5 py-3.5 w-40">Room</th>
                      <th className="px-5 py-3.5 w-44">Stay Dates</th>
                      <th className="px-5 py-3.5 w-36">Amount (₱)</th>
                      <th className="px-5 py-3.5 w-32">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D8] bg-white">
                    {dailyData?.bookings?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-[#6E6B65] font-medium">
                          No reservations registered for this date.
                        </td>
                      </tr>
                    ) : (
                      dailyData?.bookings?.map((b: any) => (
                        <tr key={b.id}>
                          <td className="px-5 py-3.5 font-mono font-bold text-[#C84B31]">{b.reservationCode}</td>
                          <td className="px-5 py-3.5 font-bold text-[#1C1B18]">{b.guestName}</td>
                          <td className="px-5 py-3.5">Room {b.roomNumber} ({b.roomType})</td>
                          <td className="px-5 py-3.5 text-[#6E6B65] font-medium">
                            {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-[#1C1B18]">{formatCurrency(b.totalAmount)}</td>
                          <td className="px-5 py-3.5 font-bold text-[#2D5A39]">{b.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY REVENUE REPORT */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="zen-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#1C1B18] font-bold">Select Month:</label>
              <input
                type="month"
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                className="zen-input px-3 py-1.5 text-xs text-[#1C1B18] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportMonthlyExcel}
                className="px-3.5 py-1.5 zen-btn text-xs font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-[#6E6B65]" /> Export Excel
              </button>
              <button
                onClick={() => exportElementToPDF('monthly-report-view', `Monthly_Revenue_${monthlyMonth}`)}
                className="px-3.5 py-1.5 zen-btn-primary text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <FileText className="w-4 h-4" /> PDF Report
              </button>
            </div>
          </div>

          <div id="monthly-report-view" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="zen-card p-5">
                <div className="text-xs font-semibold uppercase text-[#6E6B65]">Total Billed Revenue</div>
                <div className="text-2xl font-bold text-[#C84B31] mt-1">{formatCurrency(monthlyData?.totalRevenue || 0)}</div>
              </div>
              <div className="zen-card p-5">
                <div className="text-xs font-semibold uppercase text-[#6E6B65]">Collected Cash / Payments</div>
                <div className="text-2xl font-bold text-[#2D5A39] mt-1">{formatCurrency(monthlyData?.paidRevenue || 0)}</div>
              </div>
              <div className="zen-card p-5">
                <div className="text-xs font-semibold uppercase text-[#6E6B65]">Pending Balances</div>
                <div className="text-2xl font-bold text-[#9A6208] mt-1">{formatCurrency(monthlyData?.pendingRevenue || 0)}</div>
              </div>
            </div>

            {/* Room Type Revenue Breakdown */}
            <div className="zen-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#1C1B18]">Revenue Breakdown by Room Type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {monthlyData?.roomTypeRevenue &&
                  Object.entries(monthlyData.roomTypeRevenue).map(([type, rev]: [string, any]) => (
                    <div key={type} className="p-3.5 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8]">
                      <div className="text-xs text-[#6E6B65] font-semibold">{type} Class</div>
                      <div className="text-base font-bold text-[#1C1B18] mt-1">{formatCurrency(rev)}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OCCUPANCY REPORT */}
      {activeTab === 'occupancy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="zen-card p-5">
              <div className="text-xs font-semibold uppercase text-[#6E6B65]">Total Room Inventory</div>
              <div className="text-2xl font-bold text-[#1C1B18] mt-1">{occupancyData?.totalRooms || 0} Rooms</div>
            </div>
            <div className="zen-card p-5">
              <div className="text-xs font-semibold uppercase text-[#6E6B65]">System Occupancy Rate</div>
              <div className="text-2xl font-bold text-[#2D5A39] mt-1">78%</div>
            </div>
            <div className="zen-card p-5">
              <div className="text-xs font-semibold uppercase text-[#6E6B65]">Average Rate / Room</div>
              <div className="text-2xl font-bold text-[#C84B31] mt-1">₱5,150.00</div>
            </div>
          </div>

          <div className="zen-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#1C1B18]">Room Availability Matrix by Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {occupancyData?.byType &&
                Object.entries(occupancyData.byType).map(([type, stats]: [string, any]) => (
                  <div key={type} className="p-4 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-[#1C1B18]">
                      <span>{type} Rooms</span>
                      <span className="text-[#C84B31] bg-white border border-[#E5E0D8] px-2.5 py-0.5 rounded-full">{stats.total} Total</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-[#E5E0D8] font-semibold">
                      <div className="text-[#2D5A39]">{stats.available} Available</div>
                      <div className="text-[#2C4366]">{stats.occupied} Occupied</div>
                      <div className="text-[#9A6208]">{stats.reserved} Reserved</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
