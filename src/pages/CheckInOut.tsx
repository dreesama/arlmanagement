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
  Trash2,
  Edit2,
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

  // Line Item Inline Editor State
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editItemDesc, setEditItemDesc] = useState('');
  const [editItemPrice, setEditItemPrice] = useState<number>(0);
  const [editItemQty, setEditItemQty] = useState<number>(1);

  // Pre-Check-Out & Settlement Modal State
  const [checkoutModalRes, setCheckoutModalRes] = useState<Reservation | null>(null);
  const [checkoutBilling, setCheckoutBilling] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('Cash');
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('Checkout settlement');

  // Printable Paper Size Selection State ('short' | 'half' | 'thermal')
  const [paperSize, setPaperSize] = useState<'short' | 'half' | 'thermal'>('short');

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

  const handleDeleteChargeItem = async (itemIdx: number) => {
    if (!incidentalBilling || !incidentalBilling.items) return;
    if (!confirm('Are you sure you want to remove this charge item?')) return;
    try {
      const updatedItems = incidentalBilling.items.filter((_: any, idx: number) => idx !== itemIdx);
      await api.updateBilling(incidentalBilling.id, {
        discountType: incidentalBilling.discountType || 'percentage',
        discountValue: incidentalBilling.discountValue || 0,
        items: updatedItems,
      });
      const fresh = await api.getBillingById(incidentalBilling.id);
      setIncidentalBilling(fresh);
      loadData();
    } catch (err: any) {
      alert(`Error removing charge: ${err.message}`);
    }
  };

  const handleStartEditItem = (idx: number, item: any) => {
    setEditingItemIdx(idx);
    setEditItemDesc(item.description);
    setEditItemPrice(item.unitPrice || item.amount);
    setEditItemQty(item.quantity || 1);
  };

  const handleSaveEditItem = async (itemIdx: number) => {
    if (!incidentalBilling || !incidentalBilling.items) return;
    try {
      const updatedItems = [...incidentalBilling.items];
      updatedItems[itemIdx] = {
        description: editItemDesc,
        quantity: Number(editItemQty),
        unitPrice: Number(editItemPrice),
        amount: Number(editItemPrice) * Number(editItemQty),
      };

      await api.updateBilling(incidentalBilling.id, {
        discountType: incidentalBilling.discountType || 'percentage',
        discountValue: incidentalBilling.discountValue || 0,
        items: updatedItems,
      });

      setEditingItemIdx(null);
      const fresh = await api.getBillingById(incidentalBilling.id);
      setIncidentalBilling(fresh);
      loadData();
    } catch (err: any) {
      alert(`Error updating charge item: ${err.message}`);
    }
  };

  const handleRecordActiveFolioPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentalBilling) return;
    try {
      await api.recordPayment(incidentalBilling.id, {
        amount: Number(settleAmount),
        method: settleMethod,
        referenceNo: settleRef,
        notes: settleNotes || 'Mid-stay folio payment',
      });
      alert('Payment recorded successfully!');
      const fresh = await api.getBillingById(incidentalBilling.id);
      setIncidentalBilling(fresh);
      setSettleAmount(fresh.balanceAmount);
      loadData();
    } catch (err: any) {
      alert(`Error recording payment: ${err.message}`);
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
                    <LogOut className="w-3.5 h-3.5" /> Statement & Check-Out
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
                          title="Manage active stay charges, edit items, record payments & print statement of account"
                        >
                          <FileText className="w-3 h-3 text-[#C84B31]" /> Guest Account & Charges
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
                className="px-4 py-2 zen-btn-primary text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Registration Card
              </button>
            </div>

            {/* Printable Hotel Registration Card Container */}
            <div
              id="printable-registration-card"
              className={`bg-white rounded-xl border border-[#E5E0D8] space-y-6 ${
                paperSize === 'thermal'
                  ? 'max-w-[80mm] mx-auto p-3 text-[10px]'
                  : paperSize === 'half'
                  ? 'max-w-[5.5in] mx-auto p-4'
                  : 'max-w-[8.5in] mx-auto p-6'
              }`}
            >
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

      {/* 2. Active Guest Account & Statement Management Modal */}
      <Modal
        isOpen={!!incidentalModalRes}
        onClose={() => setIncidentalModalRes(null)}
        title={`Guest Account & Statement — Room ${incidentalModalRes?.roomNumber}`}
        subtitle={`Guest: ${incidentalModalRes?.guestName} • Invoice #: ${incidentalBilling?.invoiceNumber}`}
        maxWidth="5xl"
      >
        {incidentalModalRes && (
          <div className="space-y-4 text-xs text-[#1C1B18]">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center bg-[#F5F2EC] p-3 rounded-xl border border-[#E5E0D8] no-print">
              <span className="font-bold text-[#6E6B65] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#C84B31]" /> Guest Account Ledger & Incidentals Station
              </span>
              <button
                onClick={printInvoice}
                className="px-4 py-2 zen-btn-primary text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Statement of Account
              </button>
            </div>

            {/* Split Screen 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Management Station (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-4 no-print">
                {/* Financial Summary Box */}
                <div className="p-3.5 bg-white rounded-xl border border-[#E5E0D8] space-y-1">
                  <div className="flex justify-between font-bold text-sm text-[#1C1B18]">
                    <span>Total Billed Volume:</span>
                    <span className="text-[#C84B31]">{formatCurrency(incidentalBilling?.grandTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#2D5A39] font-bold">
                    <span>Total Payments Received:</span>
                    <span>{formatCurrency(incidentalBilling?.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#9A6208] font-extrabold pt-1 border-t border-[#E5E0D8]">
                    <span>Current Balance Due:</span>
                    <span>{formatCurrency(incidentalBilling?.balanceAmount || 0)}</span>
                  </div>
                </div>

                {/* Post New Incidental Charge Section */}
                <form onSubmit={handleAddIncidentalCharge} className="p-3.5 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] space-y-2.5">
                  <h4 className="font-bold text-[#1C1B18] text-xs flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#C84B31]" /> Add / Post New Extra Charge
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-[#1C1B18] mb-0.5">Item Particular *</label>
                      <input
                        type="text"
                        required
                        value={chargeDesc}
                        onChange={(e) => setChargeDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 zen-input text-xs text-[#1C1B18]"
                        placeholder="e.g. Room Service, Minibar"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1C1B18] mb-0.5">Amount (₱) *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={chargePrice}
                        onChange={(e) => setChargePrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 zen-input text-xs font-bold text-[#1C1B18]"
                      />
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] text-[#6E6B65] font-bold">Presets:</span>
                    {[
                      { label: 'Food & Beverage', price: 450 },
                      { label: 'Minibar', price: 250 },
                      { label: 'Laundry', price: 300 },
                      { label: 'Extra Bed', price: 800 },
                      { label: 'Spa Service', price: 1200 },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setChargeDesc(preset.label);
                          setChargePrice(preset.price);
                        }}
                        className="px-1.5 py-0.5 bg-white border border-[#E5E0D8] hover:bg-[#C84B31] hover:text-white text-[10px] font-bold rounded transition-all text-[#C84B31]"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 zen-btn-primary text-xs font-bold shadow-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Post Charge
                    </button>
                  </div>
                </form>

                {/* Current Billed Line Items List with Edit/Delete */}
                {incidentalBilling?.items && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-[#6E6B65] text-[10px] uppercase border-b border-[#E5E0D8] pb-1">
                      ITEMIZED PARTICULAR CHARGES ({incidentalBilling.items.length}):
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {incidentalBilling.items.map((item: any, idx: number) => (
                        <div key={idx} className="p-2 bg-white rounded-lg border border-[#E5E0D8] text-xs">
                          {editingItemIdx === idx ? (
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                value={editItemDesc}
                                onChange={(e) => setEditItemDesc(e.target.value)}
                                className="w-full px-2 py-1 zen-input text-xs font-semibold text-[#1C1B18]"
                              />
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={editItemPrice}
                                  onChange={(e) => setEditItemPrice(Number(e.target.value))}
                                  className="w-24 px-2 py-1 zen-input text-xs font-bold text-[#1C1B18]"
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditItem(idx)}
                                    className="px-2 py-1 bg-[#2D5A39] text-white hover:bg-[#1E3E27] rounded text-[11px] font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemIdx(null)}
                                    className="px-2 py-1 zen-btn text-[11px] font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-bold text-[#1C1B18]">{item.description}</span>
                                <span className="text-[#6E6B65] ml-1.5 text-[11px] font-medium">(×{item.quantity})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#C84B31]">{formatCurrency(item.amount)}</span>
                                <button
                                  onClick={() => handleStartEditItem(idx, item)}
                                  className="p-1 rounded text-[#6E6B65] hover:text-[#C84B31] hover:bg-[#F5F2EC] border border-[#E5E0D8]"
                                  title="Edit description or price"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteChargeItem(idx)}
                                  className="p-1 rounded text-[#6E6B65] hover:text-rose-600 hover:bg-rose-50 border border-[#E5E0D8]"
                                  title="Delete charge item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Record Mid-Stay Payment Section */}
                <form onSubmit={handleRecordActiveFolioPayment} className="p-3.5 bg-[#EBF5EF] rounded-xl border border-[#BCE3C8] space-y-2.5">
                  <h4 className="font-bold text-[#2D5A39] text-xs flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Record Mid-Stay Payment
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-[#1C1B18] mb-0.5">Amount (₱) *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={incidentalBilling?.balanceAmount || 999999}
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 zen-input text-xs font-bold text-[#1C1B18]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1C1B18] mb-0.5">Method *</label>
                      <select
                        value={settleMethod}
                        onChange={(e) => setSettleMethod(e.target.value as PaymentMethod)}
                        className="w-full px-2.5 py-1.5 zen-input text-xs text-[#1C1B18]"
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
                      placeholder="Ref / Transaction #"
                      className="flex-1 px-2.5 py-1.5 zen-input text-xs text-[#1C1B18]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#2D5A39] text-white hover:bg-[#1E3E27] rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Post Payment
                    </button>
                  </div>
                </form>
              </div>

              {/* RIGHT COLUMN: Live Printable Statement & Receipt Preview (lg:col-span-7) */}
              <div className="lg:col-span-7">
                {/* Printable Realistic 5-Star Hotel Statement of Account */}
                <div id="printable-active-folio" className="p-6 bg-white text-[#111111] space-y-4 border border-[#E5E0D8] rounded-xl shadow-xs">
                  {/* Hotel Official Letterhead */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-3">
                    <div className="flex items-center gap-3">
                      <Logo size={38} />
                      <div>
                        <h1 className="text-xl font-bold tracking-tight text-black leading-none uppercase">ARL's Hotel & Resort</h1>
                        <p className="text-[10px] text-[#444444] font-semibold tracking-wider uppercase mt-1">123 Coastal Boulevard, Hotel District, Manila</p>
                        <p className="text-[10px] text-[#666666]">TIN: 009-887-654-000 • Tel: +63 (2) 8123-4567 • info@arlshotel.com</p>
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-black">STATEMENT OF ACCOUNT</div>
                      <div className="font-mono text-sm font-bold text-[#C84B31]">{incidentalBilling?.invoiceNumber}</div>
                      <div className="text-[10px] text-[#666666]">Date: {formatDate(todayStr)}</div>
                    </div>
                  </div>

                  {/* Guest Particulars Table */}
                  <div className="grid grid-cols-2 gap-4 text-xs py-2 border-b border-gray-300">
                    <div className="space-y-1">
                      <div><span className="font-bold text-[#666666] uppercase text-[10px]">Guest Name:</span> <span className="font-bold text-black">{incidentalModalRes.guestName}</span></div>
                      <div><span className="font-bold text-[#666666] uppercase text-[10px]">Room Assignment:</span> <span className="font-bold text-[#C84B31]">Room {incidentalModalRes.roomNumber} ({incidentalModalRes.roomType})</span></div>
                      <div><span className="font-bold text-[#666666] uppercase text-[10px]">Billing Code:</span> <span className="font-mono">{incidentalModalRes.reservationCode}</span></div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div><span className="font-bold text-[#666666] uppercase text-[10px]">Arrival Date:</span> <span className="font-bold text-black">{formatDate(incidentalModalRes.checkInDate)}</span></div>
                      <div><span className="font-bold text-[#666666] uppercase text-[10px]">Departure Date:</span> <span className="font-bold text-black">{formatDate(incidentalModalRes.checkOutDate)}</span></div>
                      <div><span className="font-bold text-[#666666] uppercase text-[10px]">Duration:</span> <span className="font-bold text-black">{incidentalModalRes.nights} Night(s)</span></div>
                    </div>
                  </div>

                  {/* Itemized Particulars Ledger */}
                  {incidentalBilling && (
                    <div className="space-y-3 pt-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-t-2 border-b-2 border-black text-[10px] uppercase font-bold text-black">
                            <th className="py-1.5 px-1">Date</th>
                            <th className="py-1.5 px-1">Description & Particulars</th>
                            <th className="py-1.5 px-1 text-center">Qty</th>
                            <th className="py-1.5 px-1 text-right">Charges (₱)</th>
                            <th className="py-1.5 px-1 text-right">Credits (₱)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {incidentalBilling.items && incidentalBilling.items.map((item: any, idx: number) => (
                            <tr key={idx} className="text-xs">
                              <td className="py-1.5 px-1 text-[#666666]">{formatDate(todayStr)}</td>
                              <td className="py-1.5 px-1 font-medium text-black">{item.description}</td>
                              <td className="py-1.5 px-1 text-center text-[#666666]">{item.quantity}</td>
                              <td className="py-1.5 px-1 text-right font-bold text-black">{formatCurrency(item.amount)}</td>
                              <td className="py-1.5 px-1 text-right text-[#666666]">₱0.00</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals Summary */}
                      <div className="flex justify-end pt-2">
                        <div className="w-64 space-y-1 text-xs">
                          <div className="flex justify-between text-[#666666]">
                            <span>Subtotal Charges:</span>
                            <span className="font-bold text-black">{formatCurrency(incidentalBilling.subtotal || incidentalBilling.grandTotal)}</span>
                          </div>
                          <div className="flex justify-between text-[#666666]">
                            <span>VAT Tax (12%):</span>
                            <span className="font-bold text-black">{formatCurrency(incidentalBilling.taxAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between text-[#666666]">
                            <span>Service Charge (10%):</span>
                            <span className="font-bold text-black">{formatCurrency(incidentalBilling.serviceCharge || 0)}</span>
                          </div>
                          <div className="flex justify-between text-[#2D5A39] font-bold">
                            <span>Total Payments Received:</span>
                            <span>−{formatCurrency(incidentalBilling.paidAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-extrabold text-black pt-1.5 border-t-2 border-black">
                            <span>NET BALANCE DUE:</span>
                            <span className="text-[#C84B31]">{formatCurrency(incidentalBilling.balanceAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Philippine Hotel Tax Breakdown Box */}
                  <div className="grid grid-cols-4 gap-2 text-[9px] p-2 border border-gray-300 text-center font-mono bg-gray-50 uppercase">
                    <div><span className="text-gray-500 block">VATable Sales</span> <span className="font-bold text-black">{formatCurrency(incidentalBilling?.subtotal || 0)}</span></div>
                    <div><span className="text-gray-500 block">VAT Amount (12%)</span> <span className="font-bold text-black">{formatCurrency(incidentalBilling?.taxAmount || 0)}</span></div>
                    <div><span className="text-gray-500 block">VAT Exempt Sales</span> <span className="font-bold text-black">₱0.00</span></div>
                    <div><span className="text-gray-500 block">Zero Rated Sales</span> <span className="font-bold text-black">₱0.00</span></div>
                  </div>

                  {/* Legal Statement & Signature Lines */}
                  <div className="pt-4 space-y-4">
                    <p className="text-[9px] text-gray-500 italic leading-tight text-justify">
                      I agree that my liability for this invoice is not waived and I agree to be held personally liable in the event that the indicated person, company, or association fails to pay for any part or full amount of these charges.
                    </p>
                    <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4">
                      <div className="space-y-4">
                        <div className="border-b border-black pb-1 font-bold text-black uppercase text-[11px]">
                          {incidentalModalRes.guestName}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Guest Signature over Printed Name</div>
                      </div>
                      <div className="space-y-4">
                        <div className="border-b border-black pb-1 font-bold text-black uppercase text-[11px]">
                          Front Desk Receptionist / Cashier
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Authorized Front Desk Signature</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E0D8] no-print">
              <button
                type="button"
                onClick={() => setIncidentalModalRes(null)}
                className="px-5 py-2 zen-btn-primary text-xs font-bold shadow-xs"
              >
                Close Account Station
              </button>
            </div>
          </div>
        )}
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
                <FileText className="w-4 h-4 text-[#C84B31]" /> Review Guest Statement of Account, settle balance, and print checkout receipt.
              </span>
              <button
                onClick={printInvoice}
                className="px-4 py-2 zen-btn-primary text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Checkout Receipt
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
