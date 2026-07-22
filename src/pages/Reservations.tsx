import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Edit2, XCircle, Download, Calendar, UserCheck } from 'lucide-react';
import { Reservation, Room, Guest } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getReservationStatusBadge } from '../lib/utils';
import { exportToExcel } from '../utils/exports';
import { Modal } from '../components/ui/Modal';

export const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);

  // Form Fields
  const [guestId, setGuestId] = useState<number>(0);
  const [roomId, setRoomId] = useState<number>(0);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, roomData, guestData] = await Promise.all([
        api.getReservations(),
        api.getRooms(),
        api.getGuests(),
      ]);
      setReservations(resData);
      setRooms(roomData);
      setGuests(guestData);

      if (guestData.length > 0) setGuestId(guestData[0].id);
      if (roomData.length > 0) setRoomId(roomData[0].id);
    } catch (err) {
      console.error('Failed to load reservation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = (inDate: string, outDate: string) => {
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diff = Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));
    return isNaN(diff) ? 1 : diff;
  };

  const handleOpenCreate = () => {
    setEditingRes(null);
    if (guests.length > 0) setGuestId(guests[0].id);
    if (rooms.length > 0) setRoomId(rooms[0].id);
    setCheckInDate(new Date().toISOString().split('T')[0]);
    setCheckOutDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setAdults(2);
    setChildren(0);
    setSpecialRequests('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res: Reservation) => {
    setEditingRes(res);
    setGuestId(res.guestId);
    setRoomId(res.roomId);
    setCheckInDate(res.checkInDate);
    setCheckOutDate(res.checkOutDate);
    setAdults(res.adults);
    setChildren(res.children);
    setSpecialRequests(res.specialRequests || '');
    setIsModalOpen(true);
  };

  const handleSaveReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const nights = calculateNights(checkInDate, checkOutDate);
    const payload = {
      guestId: Number(guestId),
      roomId: Number(roomId),
      checkInDate,
      checkOutDate,
      nights,
      adults: Number(adults),
      children: Number(children),
      specialRequests,
    };

    try {
      if (editingRes) {
        await api.updateReservation(editingRes.id, { ...payload, status: editingRes.status });
      } else {
        await api.createReservation(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error saving reservation: ${err.message}`);
    }
  };

  const handleCancelReservation = async (id: number) => {
    if (confirm('Are you sure you want to cancel this reservation? The room will be freed.')) {
      try {
        await api.cancelReservation(id);
        loadData();
      } catch (err: any) {
        alert(`Error cancelling reservation: ${err.message}`);
      }
    }
  };

  const filteredReservations = reservations.filter((res) => {
    const matchesSearch =
      res.reservationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.guestName && res.guestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (res.roomNumber && res.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === 'All' || res.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleExportExcel = () => {
    const dataToExport = filteredReservations.map((res) => ({
      'Reservation Code': res.reservationCode,
      Guest: res.guestName,
      'Room Number': res.roomNumber,
      'Room Type': res.roomType,
      'Check-In': res.checkInDate,
      'Check-Out': res.checkOutDate,
      Nights: res.nights,
      'Guests (Adults/Kids)': `${res.adults}A / ${res.children}K`,
      'Total Amount (PHP)': res.totalAmount,
      Status: res.status,
      'Created Date': res.createdAt,
    }));
    exportToExcel(dataToExport, 'ARL_Hotel_Reservations_Export');
  };

  const selectedRoomObj = rooms.find((r) => r.id === Number(roomId));
  const estimatedNights = calculateNights(checkInDate, checkOutDate);
  const estimatedTotal = selectedRoomObj ? selectedRoomObj.ratePerNight * estimatedNights : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="zen-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B18] tracking-tight">Reservation Management</h2>
          <p className="text-xs text-[#6E6B65] font-medium">Total {reservations.length} guest bookings registered</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 zen-btn rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-[#6E6B65]" /> Export Excel
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 zen-btn-primary rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> New Reservation
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="zen-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6B65]" />
          <input
            type="text"
            placeholder="Search code, guest name, room #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 zen-input text-xs text-[#1C1B18] placeholder-[#6E6B65]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#6E6B65] font-semibold">
            <Filter className="w-3.5 h-3.5" /> Status Filter:
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="zen-input text-xs text-[#1C1B18] rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Checked-In">Checked-In</option>
            <option value="Checked-Out">Checked-Out</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Elegant Data Table Container */}
      <div className="zen-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1B18] table-fixed">
            <thead className="bg-[#F5F2EC] text-[#6E6B65] font-bold border-b border-[#E5E0D8]">
              <tr>
                <th className="px-4 py-3.5 w-32">Code</th>
                <th className="px-4 py-3.5 w-48">Guest Information</th>
                <th className="px-4 py-3.5 w-36">Room Assigned</th>
                <th className="px-4 py-3.5 w-44">Stay Schedule</th>
                <th className="px-4 py-3.5 w-28">Occupancy</th>
                <th className="px-4 py-3.5 w-36">Total Cost (₱)</th>
                <th className="px-4 py-3.5 w-32">Status</th>
                <th className="px-4 py-3.5 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8] bg-white">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#6E6B65] font-medium">
                    No reservations match your search.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-[#F5F2EC]/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#C84B31]">
                      {res.reservationCode}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#1C1B18]">{res.guestName}</div>
                      <div className="text-[10px] text-[#6E6B65] truncate font-medium">{res.guestPhone || res.guestEmail}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="bg-[#F5F2EC] text-[#1C1B18] px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#E5E0D8]">
                        Room {res.roomNumber} ({res.roomType})
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#1C1B18] font-medium">
                      <div>
                        {formatDate(res.checkInDate)} → {formatDate(res.checkOutDate)}
                      </div>
                      <div className="text-[10px] text-[#6E6B65] font-semibold">{res.nights} night(s)</div>
                    </td>
                    <td className="px-4 py-3.5 text-[#1C1B18] font-medium">
                      {res.adults} Adults{res.children > 0 ? `, ${res.children} Kids` : ''}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#1C1B18] text-sm">
                      {formatCurrency(res.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${getReservationStatusBadge(res.status)}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {res.status !== 'Cancelled' && res.status !== 'Checked-Out' && (
                          <button
                            onClick={() => handleOpenEdit(res)}
                            className="p-1.5 rounded-lg text-[#6E6B65] hover:text-[#C84B31] hover:bg-[#F5F2EC] transition-colors border border-[#E5E0D8]"
                            title="Edit Reservation"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {res.status === 'Confirmed' && (
                          <button
                            onClick={() => handleCancelReservation(res.id)}
                            className="p-1.5 rounded-lg text-[#6E6B65] hover:text-rose-600 hover:bg-rose-50 transition-colors border border-[#E5E0D8]"
                            title="Cancel Reservation"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Reservation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRes ? `Edit Reservation ${editingRes.reservationCode}` : 'Create Reservation'}
        subtitle="Select guest, assign room, and specify stay duration"
      >
        <form onSubmit={handleSaveReservation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Select Guest *</label>
            <select
              value={guestId}
              onChange={(e) => setGuestId(Number(e.target.value))}
              disabled={!!editingRes}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.fullName} ({g.email || g.phone}) {g.isVip ? '★ VIP' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Assign Room *</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(Number(e.target.value))}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number} — {r.type} ({formatCurrency(r.ratePerNight)}/night) [{r.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Check-In Date *</label>
              <input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Check-Out Date *</label>
              <input
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Adult Guests *</label>
              <input
                type="number"
                min={1}
                required
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Children</label>
              <input
                type="number"
                min={0}
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Special Requests & Notes</label>
            <textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="e.g. High floor, extra towels, late check-in"
            />
          </div>

          {/* Pricing Computation Box */}
          <div className="p-3 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] text-xs flex justify-between items-center">
            <div>
              <span className="text-[#6E6B65] font-medium">Duration: </span>
              <span className="font-bold text-[#1C1B18]">{estimatedNights} Night(s)</span>
            </div>
            <div>
              <span className="text-[#6E6B65] font-medium">Estimated Total: </span>
              <span className="font-bold text-[#C84B31] text-sm">{formatCurrency(estimatedTotal)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 zen-btn text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 zen-btn-primary text-xs font-bold shadow-xs"
            >
              {editingRes ? 'Update Booking' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
