import React, { useEffect, useState } from 'react';
import { UserCheck, LogOut, CheckCircle, Key, Calendar, BedDouble } from 'lucide-react';
import { Reservation } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { Modal } from '../components/ui/Modal';

export const CheckInOut: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Check-Out
  const [checkoutModalRes, setCheckoutModalRes] = useState<Reservation | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getReservations();
      setReservations(data);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const arrivalsToday = reservations.filter(
    (r) => r.checkInDate === todayStr && r.status === 'Confirmed'
  );

  const departuresToday = reservations.filter(
    (r) => r.checkOutDate === todayStr && r.status === 'Checked-In'
  );

  const checkedInGuests = reservations.filter((r) => r.status === 'Checked-In');

  const handleProcessCheckIn = async (id: number) => {
    if (confirm('Process Check-In for this guest? Room status will become Occupied.')) {
      try {
        await api.checkInReservation(id);
        alert('Check-In processed successfully! Key card issued.');
        loadData();
      } catch (err: any) {
        alert(`Error checking in: ${err.message}`);
      }
    }
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutModalRes) return;
    try {
      await api.checkOutReservation(checkoutModalRes.id);
      alert('Guest checked out successfully! Room marked as Available.');
      setCheckoutModalRes(null);
      loadData();
    } catch (err: any) {
      alert(`Error checking out: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header Banner */}
      <div className="zen-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B18] tracking-tight">Front Desk Check-In & Check-Out Desk</h2>
          <p className="text-xs text-[#6E6B65] font-medium mt-0.5">
            Arrivals today: <span className="text-[#2D5A39] font-bold">{arrivalsToday.length}</span> • Departures today:{' '}
            <span className="text-[#9A6208] font-bold">{departuresToday.length}</span>
          </p>
        </div>
      </div>

      {/* Two-Column Japandi Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Today's Arrivals */}
        <div className="zen-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EBF5EF] border border-[#BCE3C8] flex items-center justify-center text-[#2D5A39]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1C1B18]">Arrivals Scheduled Today</h3>
                <p className="text-[11px] text-[#6E6B65] font-medium">Scheduled check-ins for {formatDate(todayStr)}</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#EBF5EF] text-[#2D5A39] border border-[#BCE3C8]">
              {arrivalsToday.length} Expected
            </span>
          </div>

          <div className="space-y-3">
            {arrivalsToday.length === 0 ? (
              <div className="py-8 text-center text-[#6E6B65] text-xs font-medium bg-[#F5F2EC]/40 rounded-xl border border-dashed border-[#E5E0D8]">
                No pending arrivals scheduled for today.
              </div>
            ) : (
              arrivalsToday.map((res) => (
                <div
                  key={res.id}
                  className="p-4 bg-[#F5F2EC]/50 rounded-xl border border-[#E5E0D8] flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1C1B18]">{res.guestName}</span>
                      <span className="text-[10px] font-mono text-[#C84B31] font-bold bg-white px-1.5 py-0.5 rounded border border-[#E5E0D8]">
                        {res.reservationCode}
                      </span>
                    </div>
                    <div className="text-xs text-[#1C1B18] font-medium">
                      Assigned Room <span className="font-bold text-[#C84B31]">{res.roomNumber}</span> ({res.roomType})
                    </div>
                    <div className="text-[11px] text-[#6E6B65] font-medium">
                      Stay: {res.nights} night(s) • {res.adults} Adults
                    </div>
                  </div>

                  <button
                    onClick={() => handleProcessCheckIn(res.id)}
                    className="px-3.5 py-2 zen-btn-primary text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                  >
                    <Key className="w-3.5 h-3.5" /> Check-In Guest
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Today's Departures */}
        <div className="zen-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FEF7EC] border border-[#FCE1B6] flex items-center justify-center text-[#9A6208]">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1C1B18]">Departures Scheduled Today</h3>
                <p className="text-[11px] text-[#6E6B65] font-medium">Scheduled check-outs for {formatDate(todayStr)}</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#FEF7EC] text-[#9A6208] border border-[#FCE1B6]">
              {departuresToday.length} Due
            </span>
          </div>

          <div className="space-y-3">
            {departuresToday.length === 0 ? (
              <div className="py-8 text-center text-[#6E6B65] text-xs font-medium bg-[#F5F2EC]/40 rounded-xl border border-dashed border-[#E5E0D8]">
                No pending check-outs scheduled for today.
              </div>
            ) : (
              departuresToday.map((res) => (
                <div
                  key={res.id}
                  className="p-4 bg-[#F5F2EC]/50 rounded-xl border border-[#E5E0D8] flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1C1B18]">{res.guestName}</span>
                      <span className="text-[10px] font-mono text-[#9A6208] font-bold bg-white px-1.5 py-0.5 rounded border border-[#E5E0D8]">
                        {res.reservationCode}
                      </span>
                    </div>
                    <div className="text-xs text-[#1C1B18] font-medium">
                      Room <span className="font-bold text-[#9A6208]">{res.roomNumber}</span> • Checked in{' '}
                      {formatDate(res.checkInDate)}
                    </div>
                    <div className="text-[11px] text-[#6E6B65] font-medium">Bill Total: {formatCurrency(res.totalAmount)}</div>
                  </div>

                  <button
                    onClick={() => setCheckoutModalRes(res)}
                    className="px-3.5 py-2 zen-btn text-[#9A6208] hover:text-[#9A6208] text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Check-Out
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Currently In-House Guests Table Container */}
      <div className="zen-card overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#E5E0D8]">
          <h3 className="text-sm font-bold text-[#1C1B18]">All Currently Checked-In Guests</h3>
          <p className="text-[11px] text-[#6E6B65] font-medium">In-house guests currently occupying hotel rooms</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1B18] table-fixed">
            <thead className="bg-[#F5F2EC] text-[#6E6B65] font-bold border-b border-[#E5E0D8]">
              <tr>
                <th className="px-4 py-3.5 w-32">Room #</th>
                <th className="px-4 py-3.5 w-48">Guest Name</th>
                <th className="px-4 py-3.5 w-36">Code</th>
                <th className="px-4 py-3.5 w-40">Actual Check-In</th>
                <th className="px-4 py-3.5 w-40">Scheduled Check-Out</th>
                <th className="px-4 py-3.5 w-28 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8] bg-white">
              {checkedInGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6E6B65] font-medium">
                    No guests currently checked in.
                  </td>
                </tr>
              ) : (
                checkedInGuests.map((res) => (
                  <tr key={res.id} className="hover:bg-[#F5F2EC]/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[#C84B31]">Room {res.roomNumber}</td>
                    <td className="px-4 py-3.5 font-bold text-[#1C1B18]">{res.guestName}</td>
                    <td className="px-4 py-3.5 font-mono text-[#6E6B65]">{res.reservationCode}</td>
                    <td className="px-4 py-3.5 text-[#2D5A39] font-bold">{res.actualCheckIn || formatDate(res.checkInDate)}</td>
                    <td className="px-4 py-3.5 text-[#6E6B65] font-medium">{formatDate(res.checkOutDate)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setCheckoutModalRes(res)}
                        className="px-3 py-1.5 zen-btn text-[#9A6208] text-[11px] font-bold transition-all"
                      >
                        Check-Out
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check-Out Confirmation Modal */}
      <Modal
        isOpen={!!checkoutModalRes}
        onClose={() => setCheckoutModalRes(null)}
        title={`Check-Out Processing — ${checkoutModalRes?.guestName}`}
        subtitle={`Room ${checkoutModalRes?.roomNumber} • Code: ${checkoutModalRes?.reservationCode}`}
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-[#FEF7EC] border border-[#FCE1B6] rounded-xl text-xs text-[#9A6208] font-medium">
            Confirming check-out will update the room status back to <span className="font-bold">Available</span> and finalize the stay record.
          </div>

          <div className="space-y-2 text-xs text-[#1C1B18]">
            <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
              <span className="text-[#6E6B65]">Guest Name:</span>
              <span className="font-bold text-[#1C1B18]">{checkoutModalRes?.guestName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
              <span className="text-[#6E6B65]">Room Number:</span>
              <span className="font-bold text-[#C84B31]">Room {checkoutModalRes?.roomNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
              <span className="text-[#6E6B65]">Stay Duration:</span>
              <span className="font-semibold">{checkoutModalRes?.nights} night(s)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E0D8]">
              <span className="text-[#6E6B65]">Total Room Charges:</span>
              <span className="font-bold text-[#1C1B18]">{formatCurrency(checkoutModalRes?.totalAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <button
              onClick={() => setCheckoutModalRes(null)}
              className="px-4 py-2 zen-btn text-xs font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCheckout}
              className="px-4 py-2 zen-btn-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Confirm Check-Out
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
