import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  LogOut,
  CheckCircle,
  Key,
  Calendar,
  BedDouble,
  Printer,
  Plus,
  CreditCard,
  FileText,
  DollarSign,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Reservation, Guest, Room, PaymentMethod, BillingItem } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, getPaymentStatusBadge } from '../lib/utils';
import { printInvoice } from '../utils/exports';
import { Modal } from '../components/ui/Modal';
import { Logo } from '../components/ui/Logo';

export const CheckInOut: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-Check-In & Registration Card Modal State
  const [checkinModalRes, setCheckinModalRes] = useState<Reservation | null>(null);
  const [checkinGuest, setCheckinGuest] = useState<Guest | null>(null);

  // Incidental Charges Modal State
  const [incidentalModalRes, setIncidentalModalRes] = useState<Reservation | null>(null);
  const [incidentalBilling, setIncidentalBilling] = useState<any | null>(null);
  const [chargeDesc, setChargeDesc] = useState('Room Service / Food & Beverage');
  const [chargePrice, setChargePrice] = useState<number>(350);

  // Pre-Check-Out & Settlement Modal State
  const [checkoutModalRes, setCheckoutModalRes] = useState<Reservation | null>(null);
  const [checkoutBilling, setCheckoutBilling] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('Cash');
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('Checkout settlement');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, guestData, roomData] = await Promise.all([
        api.getReservations(),
        api.getGuests(),
        api.getRooms(),
      ]);
      setReservations(resData);
      setGuests(guestData);
      setRooms(roomData);
    } catch (err) {
      console.error('Failed to load check-in data:', err);
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

  // 1. Pre-Check-In Handler
  const handleOpenCheckInModal = (res: Reservation) => {
    setCheckinModalRes(res);
    const g = guests.find((guest) => guest.id === res.guestId) || null;
    setCheckinGuest(g);
  };

  const handleConfirmCheckIn = async () => {
    if (!checkinModalRes) return;
    try {
      await api.checkInReservation(checkinModalRes.id);
      alert(`Check-In for ${checkinModalRes.guestName} completed! Key card issued.`);
      setCheckinModalRes(null);
      loadData();
    } catch (err: any) {
      alert(`Error checking in: ${err.message}`);
    }
  };

  // 2. Incidentals / Extra Charges Handler
  const handleOpenIncidentalModal = async (res: Reservation) => {
    setIncidentalModalRes(res);
    try {
      const billings = await api.getBillings();
      const b = billings.find((bill) => bill.reservationId === res.id);
      setIncidentalBilling(b || null);
      setChargeDesc('Food & Beverage / Room Service');
      setChargePrice(350);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddIncidentalCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentalBilling) return;
    try {
      const updatedItems = [
        ...(incidentalBilling.items || []),
        {
          description: chargeDesc,
          quantity: 1,
          unitPrice: Number(chargePrice),
          amount: Number(chargePrice),
        },
      ];

      await api.updateBilling(incidentalBilling.id, {
        discountType: incidentalBilling.discountType || 'percentage',
        discountValue: incidentalBilling.discountValue || 0,
        items: updatedItems,
      });

      alert(`Added charge: ${chargeDesc} (${formatCurrency(chargePrice)})`);
      // Reload billing statement
      const fresh = await api.getBillingById(incidentalBilling.id);
      setIncidentalBilling(fresh);
      setChargeDesc('Food & Beverage / Room Service');
      setChargePrice(350);
      loadData();
    } catch (err: any) {
      alert(`Error posting charge: ${err.message}`);
    }
  };

  // 3. Pre-Check-Out & Settlement Handler
  const handleOpenCheckoutModal = async (res: Reservation) => {
    setCheckoutModalRes(res);
    try {
      const billings = await api.getBillings();
      const b = billings.find((bill) => bill.reservationId === res.id);
      setCheckoutBilling(b || null);
      if (b) {
        setSettleAmount(b.balanceAmount);
      }
      setSettleMethod('Cash');
      setSettleRef('');
      setSettleNotes('Final checkout settlement');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordCheckoutPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBilling) return;
    try {
      await api.recordPayment(checkoutBilling.id, {
        amount: Number(settleAmount),
        method: settleMethod,
        referenceNo: settleRef,
        notes: settleNotes,
      });
      alert('Payment recorded successfully!');
      const fresh = await api.getBillingById(checkoutBilling.id);
      setCheckoutBilling(fresh);
      setSettleAmount(fresh.balanceAmount);
      loadData();
    } catch (err: any) {
      alert(`Error recording payment: ${err.message}`);
    }
  };

  const handleFinalizeCheckout = async () => {
    if (!checkoutModalRes) return;
    if (checkoutBilling && checkoutBilling.balanceAmount > 0) {
      if (!confirm(`This guest has an unpaid balance of ${formatCurrency(checkoutBilling.balanceAmount)}. Proceed with Checkout anyway?`)) {
        return;
      }
    }

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
            <span className="text-[#9A6208] font-bold">{departuresToday.length}</span> • Currently In-House:{' '}
            <span className="text-[#C84B31] font-bold">{checkedInGuests.length}</span>
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
                    onClick={() => handleOpenCheckInModal(res)}
                    className="px-3.5 py-2 zen-btn-primary text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                  >
                    <Key className="w-3.5 h-3.5" /> View Card & Check-In
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
                    onClick={() => handleOpenCheckoutModal(res)}
                    className="px-3.5 py-2 zen-btn text-[#9A6208] hover:text-[#9A6208] text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Folio & Check-Out
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Currently In-House Guests Table Container */}
      <div className="zen-card overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#E5E0D8] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1C1B18]">All Currently Checked-In Guests</h3>
            <p className="text-[11px] text-[#6E6B65] font-medium">In-house guests currently occupying hotel rooms</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EBF5EF] text-[#2D5A39] border border-[#BCE3C8]">
            {checkedInGuests.length} In-House Guests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1B18] table-fixed">
            <thead className="bg-[#F5F2EC] text-[#6E6B65] font-bold border-b border-[#E5E0D8]">
              <tr>
                <th className="px-4 py-3.5 w-28">Room #</th>
                <th className="px-4 py-3.5 w-48">Guest Name</th>
                <th className="px-4 py-3.5 w-32">Code</th>
                <th className="px-4 py-3.5 w-36">Actual Check-In</th>
                <th className="px-4 py-3.5 w-36">Scheduled Check-Out</th>
                <th className="px-4 py-3.5 w-48 text-right">Actions</th>
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenIncidentalModal(res)}
                          className="px-2.5 py-1.5 zen-btn text-xs font-bold text-[#C84B31] flex items-center gap-1"
                          title="Add extra room service / incidental charges"
                        >
                          <Plus className="w-3 h-3" /> Add Charge
                        </button>
                        <button
                          onClick={() => handleOpenCheckoutModal(res)}
                          className="px-3 py-1.5 zen-btn text-[#9A6208] text-[11px] font-bold transition-all flex items-center gap-1"
                        >
                          <LogOut className="w-3 h-3" /> Check-Out
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Pre-Check-In & Hotel Registration Card Modal */}
      <Modal
        isOpen={!!checkinModalRes}
        onClose={() => setCheckinModalRes(null)}
        title={`Guest Check-In & Hotel Registration Card — ${checkinModalRes?.guestName}`}
        subtitle={`Assigned Room ${checkinModalRes?.roomNumber} (${checkinModalRes?.roomType}) • Code: ${checkinModalRes?.reservationCode}`}
        maxWidth="2xl"
      >
        {checkinModalRes && (
          <div className="space-y-5 text-xs text-[#1C1B18]">
            {/* Top Action Bar */}
            <div className="flex justify-between items-center bg-[#F5F2EC] p-3 rounded-xl border border-[#E5E0D8] no-print">
              <span className="font-bold text-[#6E6B65] flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#C84B31]" /> Print Registration Card & acquire Guest Signature before check-in.
              </span>
              <button
                onClick={printInvoice}
                className="px-4 py-2 bg-[#1C1B18] text-white hover:bg-black rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Registration Card
              </button>
            </div>

            {/* Printable Hotel Registration Card Container */}
            <div id="printable-registration-card" className="p-6 bg-white rounded-xl border border-[#E5E0D8] space-y-6">
              {/* Hotel Header */}
              <div className="flex justify-between items-start border-b border-[#E5E0D8] pb-4">
                <div className="flex items-center gap-3">
                  <Logo size={36} />
                  <div>
                    <h1 className="text-lg font-bold text-[#1C1B18] leading-none">ARL's Hotel</h1>
                    <span className="text-[10px] text-[#6E6B65] font-semibold uppercase tracking-wider">Official Hotel Guest Registration Card</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-[#C84B31]">{checkinModalRes.reservationCode}</div>
                  <div className="text-[11px] text-[#6E6B65]">Date: {formatDate(todayStr)}</div>
                </div>
              </div>

              {/* Guest Profile Section */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#1C1B18] uppercase tracking-wider text-[10px] border-b border-[#E5E0D8] pb-1">
                  1. GUEST PARTICULARS
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-[#F5F2EC] rounded-lg border border-[#E5E0D8]">
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">FULL NAME:</span>
                    <span className="font-bold text-sm text-[#1C1B18]">{checkinGuest?.fullName || checkinModalRes.guestName}</span>
                  </div>
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">PHONE NUMBER:</span>
                    <span className="font-semibold text-[#1C1B18]">{checkinGuest?.phone || checkinModalRes.guestPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">EMAIL ADDRESS:</span>
                    <span className="font-semibold text-[#1C1B18]">{checkinGuest?.email || checkinModalRes.guestEmail || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">ID TYPE & NUMBER:</span>
                    <span className="font-bold text-[#1C1B18]">{checkinGuest?.idType || 'Passport'} — {checkinGuest?.idNumber || 'ID-VERIFIED'}</span>
                  </div>
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">NATIONALITY:</span>
                    <span className="font-semibold text-[#1C1B18]">{checkinGuest?.nationality || 'Filipino'}</span>
                  </div>
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">ADDRESS:</span>
                    <span className="font-semibold text-[#1C1B18] truncate block">{checkinGuest?.address || 'Manila, Philippines'}</span>
                  </div>
                </div>
              </div>

              {/* Stay & Room Details Section */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#1C1B18] uppercase tracking-wider text-[10px] border-b border-[#E5E0D8] pb-1">
                  2. ACCOMMODATION & STAY SCHEDULE
                </h4>
                <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-lg border border-[#E5E0D8] text-center">
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">ASSIGNED ROOM</span>
                    <span className="font-bold text-sm text-[#C84B31]">Room {checkinModalRes.roomNumber} ({checkinModalRes.roomType})</span>
                  </div>
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">ARRIVAL DATE & TIME</span>
                    <span className="font-bold text-xs text-[#1C1B18]">{formatDate(checkinModalRes.checkInDate)} (2:00 PM)</span>
                  </div>
                  <div>
                    <span className="text-[#6E6B65] text-[10px] font-bold block">DEPARTURE DATE</span>
                    <span className="font-bold text-xs text-[#1C1B18]">{formatDate(checkinModalRes.checkOutDate)} (12:00 PM)</span>
                  </div>
                </div>
              </div>

              {/* Hotel Rules & Terms Acknowledgment */}
              <div className="space-y-1 bg-[#F5F2EC] p-3 rounded-lg border border-[#E5E0D8] text-[10px] text-[#6E6B65]">
                <div className="font-bold text-[#1C1B18]">3. HOTEL RULES & ACKNOWLEDGEMENT OF TERMS:</div>
                <div>• Check-Out time is strictly 12:00 PM noon. Late check-out charges apply past 1:00 PM.</div>
                <div>• Smoking inside non-smoking guest rooms is strictly prohibited (Penalty fee: ₱5,000).</div>
                <div>• Guests are held liable for damaged room amenities or lost room key cards (Key card loss fee: ₱500).</div>
              </div>

              {/* Physical Signature Block */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-6">
                  <div className="border-b border-[#1C1B18] pb-1 font-bold text-[#1C1B18]">
                    {checkinGuest?.fullName || checkinModalRes.guestName}
                  </div>
                  <div className="text-[10px] text-[#6E6B65] font-semibold">Guest Signature over Printed Name</div>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-[#1C1B18] pb-1 font-bold text-[#1C1B18]">
                    Front Desk Receptionist
                  </div>
                  <div className="text-[10px] text-[#6E6B65] font-semibold">Front Desk Cashier Signature</div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8] no-print">
              <button
                onClick={() => setCheckinModalRes(null)}
                className="px-4 py-2 zen-btn text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="px-5 py-2 zen-btn-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Key className="w-4 h-4" /> Confirm Check-In & Issue Key Card
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. Add Incidentals / Extra Charges Modal */}
      <Modal
        isOpen={!!incidentalModalRes}
        onClose={() => setIncidentalModalRes(null)}
        title={`Add Extra Charges — Room ${incidentalModalRes?.roomNumber}`}
        subtitle={`Guest: ${incidentalModalRes?.guestName} • Invoice Folio: ${incidentalBilling?.invoiceNumber}`}
      >
        <form onSubmit={handleAddIncidentalCharge} className="space-y-4 text-xs">
          <div className="p-3.5 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] space-y-1">
            <div className="flex justify-between font-bold text-[#1C1B18]">
              <span>Current Grand Total:</span>
              <span className="text-[#C84B31]">{formatCurrency(incidentalBilling?.grandTotal || 0)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-[#6E6B65]">
              <span>Extra Charges Subtotal: {formatCurrency(incidentalBilling?.extraCharges || 0)}</span>
              <span>Balance Due: {formatCurrency(incidentalBilling?.balanceAmount || 0)}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1C1B18] mb-1">Item Description / Particular *</label>
            <input
              type="text"
              required
              value={chargeDesc}
              onChange={(e) => setChargeDesc(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="e.g. Minibar, Room Service Food, Laundry"
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: 'Food & Beverage', price: 450 },
                { label: 'Minibar Beverages', price: 250 },
                { label: 'Laundry Service', price: 300 },
                { label: 'Extra Rollaway Bed', price: 800 },
                { label: 'Spa Treatment', price: 1200 },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setChargeDesc(preset.label);
                    setChargePrice(preset.price);
                  }}
                  className="px-2.5 py-1 bg-white border border-[#E5E0D8] hover:bg-[#F5F2EC] text-[10px] font-bold rounded-md transition-all text-[#C84B31]"
                >
                  + {preset.label} ({formatCurrency(preset.price)})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1C1B18] mb-1">Charge Amount (₱) *</label>
            <input
              type="number"
              required
              min={1}
              value={chargePrice}
              onChange={(e) => setChargePrice(Number(e.target.value))}
              className="w-full px-3 py-2 zen-input text-xs font-bold text-[#1C1B18]"
            />
          </div>

          {/* Current Line Items Ledger */}
          {incidentalBilling?.items && (
            <div className="space-y-1.5 pt-2">
              <span className="font-bold text-[#6E6B65] text-[10px] uppercase">POSTED ITEMIZED CHARGES ({incidentalBilling.items.length}):</span>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {incidentalBilling.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between p-2 bg-[#F5F2EC] rounded-lg border border-[#E5E0D8] text-[11px] font-medium">
                    <span>{item.description} (x{item.quantity})</span>
                    <span className="font-bold text-[#1C1B18]">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <button
              type="button"
              onClick={() => setIncidentalModalRes(null)}
              className="px-4 py-2 zen-btn text-xs font-bold"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 zen-btn-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Post Incidentals Charge
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Pre-Check-Out Folio Settlement & Paid Receipt Modal */}
      <Modal
        isOpen={!!checkoutModalRes}
        onClose={() => setCheckoutModalRes(null)}
        title={`Guest Checkout & Settlement — ${checkoutModalRes?.guestName}`}
        subtitle={`Room ${checkoutModalRes?.roomNumber} • Folio Invoice: ${checkoutBilling?.invoiceNumber}`}
        maxWidth="2xl"
      >
        {checkoutModalRes && (
          <div className="space-y-5 text-xs text-[#1C1B18]">
            {/* Top Action Toolbar */}
            <div className="flex justify-between items-center bg-[#F5F2EC] p-3 rounded-xl border border-[#E5E0D8] no-print">
              <span className="font-bold text-[#6E6B65] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#C84B31]" /> Review Guest SOA, settle balance, and print checkout receipt.
              </span>
              <button
                onClick={printInvoice}
                className="px-4 py-2 bg-[#1C1B18] text-white hover:bg-black rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Checkout Receipt Report
              </button>
            </div>

            {/* Statement of Account (SOA) Summary */}
            {checkoutBilling && (
              <div className="p-4 bg-white rounded-xl border border-[#E5E0D8] space-y-3">
                <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-2 font-bold text-sm">
                  <span>Guest Statement of Account (SOA)</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs border ${getPaymentStatusBadge(checkoutBilling.status)}`}>
                    {checkoutBilling.status.toUpperCase()}
                  </span>
                </div>

                {/* Line Items Table */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {checkoutBilling.items && checkoutBilling.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-[#E5E0D8]/60">
                      <span className="font-medium">{item.description}</span>
                      <span className="font-bold text-[#1C1B18]">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Computations */}
                <div className="pt-2 space-y-1 text-xs border-t border-[#E5E0D8]">
                  <div className="flex justify-between text-[#6E6B65]">
                    <span>Subtotal:</span>
                    <span className="font-bold text-[#1C1B18]">{formatCurrency(checkoutBilling.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#6E6B65]">
                    <span>VAT (12%) & Service Charge (10%):</span>
                    <span className="font-bold text-[#1C1B18]">{formatCurrency(checkoutBilling.taxAmount + checkoutBilling.serviceCharge)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-[#1C1B18] pt-1 border-t border-[#E5E0D8]">
                    <span>Grand Total:</span>
                    <span className="text-[#C84B31]">{formatCurrency(checkoutBilling.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#2D5A39]">
                    <span>Total Paid to Date:</span>
                    <span>{formatCurrency(checkoutBilling.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-[#9A6208] pt-1">
                    <span>Remaining Balance Due:</span>
                    <span>{formatCurrency(checkoutBilling.balanceAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* In-Modal Balance Settlement Form (If Balance > 0) */}
            {checkoutBilling && checkoutBilling.balanceAmount > 0 && (
              <form onSubmit={handleRecordCheckoutPayment} className="p-4 bg-[#FEF7EC] rounded-xl border border-[#FCE1B6] space-y-3 no-print">
                <h4 className="font-bold text-[#9A6208] text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> Settle Remaining Balance Before Checkout
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1C1B18] mb-1">Payment Amount (₱) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={checkoutBilling.balanceAmount}
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 zen-input text-xs font-bold text-[#1C1B18]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1C1B18] mb-1">Payment Method *</label>
                    <select
                      value={settleMethod}
                      onChange={(e) => setSettleMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-1.5 zen-input text-xs text-[#1C1B18]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="GCash">GCash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                    placeholder="Reference / Transaction #"
                    className="flex-1 px-3 py-1.5 zen-input text-xs text-[#1C1B18]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 zen-btn-primary text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Record Payment
                  </button>
                </div>
              </form>
            )}

            {/* Printable Final Checkout Receipt Sheet */}
            <div id="printable-checkout-receipt" className="p-6 bg-white rounded-xl border border-[#E5E0D8] space-y-6">
              <div className="flex justify-between items-start border-b border-[#E5E0D8] pb-4">
                <div className="flex items-center gap-3">
                  <Logo size={36} />
                  <div>
                    <h1 className="text-lg font-bold text-[#1C1B18] leading-none">ARL's Hotel</h1>
                    <span className="text-[10px] text-[#6E6B65] font-semibold uppercase tracking-wider">Official Check-Out Payment Receipt Report</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-[#C84B31]">{checkoutBilling?.invoiceNumber || checkoutModalRes.reservationCode}</div>
                  <div className="text-[11px] text-[#6E6B65]">Checkout Date: {formatDate(todayStr)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#F5F2EC] p-3.5 rounded-xl border border-[#E5E0D8]">
                <div>
                  <span className="text-[10px] font-bold text-[#6E6B65] uppercase block">GUEST NAME</span>
                  <div className="font-bold text-sm text-[#1C1B18]">{checkoutModalRes.guestName}</div>
                  <div className="text-[11px] text-[#6E6B65]">Assigned Room: Room {checkoutModalRes.roomNumber} ({checkoutModalRes.roomType})</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#6E6B65] uppercase block">STAY DURATION</span>
                  <div className="font-bold text-xs text-[#1C1B18]">{formatDate(checkoutModalRes.checkInDate)} → {formatDate(checkoutModalRes.checkOutDate)}</div>
                  <div className="text-[11px] text-[#6E6B65]">{checkoutModalRes.nights} Night(s) Occupied</div>
                </div>
              </div>

              {/* Financial Table */}
              {checkoutBilling && (
                <div className="p-4 bg-white rounded-xl border border-[#E5E0D8] space-y-2">
                  <div className="flex justify-between font-bold text-xs text-[#1C1B18] border-b border-[#E5E0D8] pb-1">
                    <span>FINANCIAL SUMMARY PARTICULARS</span>
                    <span>AMOUNT (₱)</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6E6B65]">
                    <span>Total Billed Room & Incidental Fees:</span>
                    <span className="font-bold text-[#1C1B18]">{formatCurrency(checkoutBilling.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#2D5A39] font-bold">
                    <span>Total Payments Received:</span>
                    <span>{formatCurrency(checkoutBilling.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-[#1C1B18] pt-2 border-t border-[#E5E0D8]">
                    <span>Final Account Balance:</span>
                    <span className={checkoutBilling.balanceAmount === 0 ? 'text-[#2D5A39]' : 'text-[#C84B31]'}>
                      {formatCurrency(checkoutBilling.balanceAmount)} {checkoutBilling.balanceAmount === 0 ? '(CLEARED / PAID)' : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-6">
                  <div className="border-b border-[#1C1B18] pb-1 font-bold text-[#1C1B18]">
                    {checkoutModalRes.guestName}
                  </div>
                  <div className="text-[10px] text-[#6E6B65]">Guest Signature</div>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-[#1C1B18] pb-1 font-bold text-[#1C1B18]">
                    Front Desk Cashier
                  </div>
                  <div className="text-[10px] text-[#6E6B65]">Front Desk Officer Signature</div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8] no-print">
              <button
                onClick={() => setCheckoutModalRes(null)}
                className="px-4 py-2 zen-btn text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeCheckout}
                className="px-5 py-2 zen-btn-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Finalize Check-Out & Release Room
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
