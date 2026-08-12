import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Edit2, XCircle, Download, Calendar, UserCheck, Printer, CreditCard, CheckCircle, FileText } from 'lucide-react';
import { Reservation, Room, Guest, PaymentMethod } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, getReservationStatusBadge } from '../lib/utils';
import { exportToExcel, printInvoice } from '../utils/exports';
import { Modal } from '../components/ui/Modal';
import { Logo } from '../components/ui/Logo';

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

  // Deposit Payment Modal State
  const [paymentRes, setPaymentRes] = useState<Reservation | null>(null);
  const [paymentBilling, setPaymentBilling] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Printable Confirmation Voucher State
  const [printingRes, setPrintingRes] = useState<Reservation | null>(null);
  const [printingBilling, setPrintingBilling] = useState<any | null>(null);

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

  const handleOpenDepositModal = async (res: Reservation) => {
    setPaymentRes(res);
    try {
      const billings = await api.getBillings();
      const b = billings.find((bill) => bill.reservationId === res.id);
      setPaymentBilling(b || null);
      setPayAmount(b ? b.balanceAmount : res.totalAmount);
      setPayMethod('Cash');
      setPayRef('');
      setPayNotes('Advance reservation deposit');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBilling) return;
    try {
      await api.recordPayment(paymentBilling.id, {
        amount: Number(payAmount),
        method: payMethod,
        referenceNo: payRef,
        notes: payNotes,
      });
      alert('Advance reservation payment recorded successfully!');
      setPaymentRes(null);
      loadData();
    } catch (err: any) {
      alert(`Error recording deposit: ${err.message}`);
    }
  };

  const handleOpenPrintVoucher = async (res: Reservation) => {
    setPrintingRes(res);
    try {
      const billings = await api.getBillings();
      const b = billings.find((bill) => bill.reservationId === res.id);
      setPrintingBilling(b || null);
    } catch (e) {
      console.error(e);
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
                        {res.status !== 'Cancelled' && (
                          <>
                            <button
                              onClick={() => handleOpenPrintVoucher(res)}
                              className="p-1.5 rounded-lg text-[#1C1B18] bg-[#F5F2EC] hover:bg-[#1C1B18] hover:text-white transition-colors border border-[#E5E0D8]"
                              title="Print Reservation Voucher"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDepositModal(res)}
                              className="p-1.5 rounded-lg text-[#2D5A39] bg-[#EBF5EF] hover:bg-[#2D5A39] hover:text-white transition-colors border border-[#BCE3C8]"
                              title="Record Advance Deposit / Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
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

      {/* Advance Reservation Deposit Payment Dialog */}
      <Modal
        isOpen={!!paymentRes}
        onClose={() => setPaymentRes(null)}
        title={`Record Reservation Deposit — ${paymentRes?.reservationCode}`}
        subtitle={`Guest: ${paymentRes?.guestName} • Total Booking Amount: ${formatCurrency(paymentRes?.totalAmount || 0)}`}
      >
        <form onSubmit={handleRecordDeposit} className="space-y-4 text-xs">
          {paymentBilling && (
            <div className="p-3.5 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] space-y-1">
              <div className="flex justify-between font-bold text-[#1C1B18]">
                <span>Invoice: {paymentBilling.invoiceNumber}</span>
                <span className="text-[#C84B31]">{formatCurrency(paymentBilling.grandTotal)} Total</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#6E6B65]">
                <span>Total Paid: {formatCurrency(paymentBilling.paidAmount)}</span>
                <span className="font-bold text-[#9A6208]">Remaining Balance: {formatCurrency(paymentBilling.balanceAmount)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-[#1C1B18] mb-1">Deposit / Payment Amount (₱) *</label>
            <input
              type="number"
              required
              min={1}
              max={paymentBilling?.balanceAmount || paymentRes?.totalAmount || 999999}
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              className="w-full px-3 py-2 zen-input text-xs font-bold text-[#1C1B18]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#1C1B18] mb-1">Payment Method *</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
            >
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#1C1B18] mb-1">Reference / Transaction Number</label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="e.g. GCASH-987654 or Card Approval Code"
            />
          </div>

          <div>
            <label className="block font-bold text-[#1C1B18] mb-1">Payment Notes</label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="e.g. 50% advance downpayment"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <button
              type="button"
              onClick={() => setPaymentRes(null)}
              className="px-4 py-2 zen-btn text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 zen-btn-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Save Deposit Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Reservation Confirmation Voucher Modal */}
      <Modal
        isOpen={!!printingRes}
        onClose={() => setPrintingRes(null)}
        title={`Reservation Voucher — ${printingRes?.reservationCode}`}
        subtitle="Official Reservation Confirmation Sheet for Guest"
        maxWidth="2xl"
      >
        {printingRes && (
          <div className="space-y-6 text-xs text-[#1C1B18]">
            {/* Top Print Toolbar */}
            <div className="flex justify-end gap-3 border-b border-[#E5E0D8] pb-3 no-print">
              <button
                onClick={printInvoice}
                className="px-4 py-2 bg-[#1C1B18] text-white hover:bg-black rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Confirmation Voucher
              </button>
            </div>

            {/* Printable Voucher Sheet */}
            <div id="printable-reservation-confirmation" className="p-6 bg-white rounded-xl border border-[#E5E0D8] space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-[#E5E0D8] pb-4">
                <div className="flex items-center gap-3">
                  <Logo size={36} />
                  <div>
                    <h1 className="text-lg font-bold text-[#1C1B18] leading-none">ARL's Hotel</h1>
                    <span className="text-[10px] text-[#6E6B65] font-semibold uppercase tracking-wider">Official Reservation Confirmation Slip</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-[#C84B31]">{printingRes.reservationCode}</div>
                  <div className="text-[11px] text-[#6E6B65]">Issued: {formatDate(printingRes.createdAt)}</div>
                </div>
              </div>

              {/* Guest & Stay Grid */}
              <div className="grid grid-cols-2 gap-4 bg-[#F5F2EC] p-4 rounded-xl border border-[#E5E0D8]">
                <div>
                  <span className="text-[10px] font-bold text-[#6E6B65] uppercase block">GUEST DETAILS</span>
                  <div className="font-bold text-sm text-[#1C1B18] mt-0.5">{printingRes.guestName}</div>
                  <div className="text-[11px] text-[#6E6B65] font-medium">{printingRes.guestPhone || printingRes.guestEmail}</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#6E6B65] uppercase block">ASSIGNED ACCOMMODATION</span>
                  <div className="font-bold text-sm text-[#C84B31] mt-0.5">Room {printingRes.roomNumber} ({printingRes.roomType})</div>
                  <div className="text-[11px] text-[#6E6B65] font-medium">{printingRes.adults} Adults{printingRes.children > 0 ? `, ${printingRes.children} Kids` : ''}</div>
                </div>
              </div>

              {/* Schedule Box */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-lg border border-[#E5E0D8] text-center">
                <div>
                  <span className="text-[10px] font-bold text-[#6E6B65] uppercase block">CHECK-IN DATE</span>
                  <span className="font-bold text-[#1C1B18] text-xs">{formatDate(printingRes.checkInDate)} (2:00 PM)</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#6E6B65] uppercase block">CHECK-OUT DATE</span>
                  <span className="font-bold text-[#1C1B18] text-xs">{formatDate(printingRes.checkOutDate)} (12:00 PM)</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#6E6B65] uppercase block">DURATION</span>
                  <span className="font-bold text-[#C84B31] text-xs">{printingRes.nights} Night(s)</span>
                </div>
              </div>

              {/* Financial Ledger Summary */}
              <div className="p-4 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] space-y-2">
                <div className="flex justify-between font-medium text-[#6E6B65]">
                  <span>Total Room Rate Billed:</span>
                  <span className="font-bold text-[#1C1B18]">{formatCurrency(printingRes.totalAmount)}</span>
                </div>
                {printingBilling && (
                  <>
                    <div className="flex justify-between font-bold text-[#2D5A39]">
                      <span>Advance Deposit Paid:</span>
                      <span>{formatCurrency(printingBilling.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#9A6208] pt-1 border-t border-[#E5E0D8]">
                      <span>Balance Due Upon Check-In:</span>
                      <span className="text-sm">{formatCurrency(printingBilling.balanceAmount)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Terms & Policies */}
              <div className="text-[10px] text-[#6E6B65] space-y-1 bg-white p-3 rounded-lg border border-[#E5E0D8]">
                <div className="font-bold text-[#1C1B18]">Important Guest Guidelines:</div>
                <div>• Standard Check-In time is 2:00 PM; Check-Out time is strictly 12:00 PM noon.</div>
                <div>• Please present a valid government-issued photo ID upon check-in at front desk.</div>
                <div>• Non-smoking suite policy enforced. A security deposit may be required upon check-in.</div>
              </div>

              {/* Signature Line */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-6">
                  <div className="border-b border-[#1C1B18] pb-1 font-bold">{printingRes.guestName}</div>
                  <div className="text-[10px] text-[#6E6B65]">Guest Signature</div>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-[#1C1B18] pb-1 font-bold">Front Desk Officer</div>
                  <div className="text-[10px] text-[#6E6B65]">Authorized Agent</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPrintingRes(null)}
                className="px-5 py-2 zen-btn text-xs font-bold"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
