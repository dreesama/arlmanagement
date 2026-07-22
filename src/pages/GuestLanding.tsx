import React, { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  Users,
  CheckCircle,
  Phone,
  Mail,
  Star,
  Sparkles,
  BedDouble,
  ShieldCheck,
  ArrowRight,
  Lock,
  Sun,
  MapPin,
  Clock,
  ChevronRight,
  Shield,
  Award,
} from 'lucide-react';
import { Room } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { CustomCursor } from '../components/ui/CustomCursor';
import { Logo } from '../components/ui/Logo';

interface GuestLandingProps {
  onGoToAdmin: () => void;
}

export const GuestLanding: React.FC<GuestLandingProps> = ({ onGoToAdmin }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);

  // Guest Reservation Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+63 ');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [adults, setAdults] = useState<number>(2);
  const [specialRequests, setSpecialRequests] = useState('');

  // Success Ticket Modal State
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await api.getRooms();
      setRooms(data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBookingModal = (room: Room) => {
    setSelectedRoomForBooking(room);
    setCheckInDate(new Date().toISOString().split('T')[0]);
    setCheckOutDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setAdults(2);
  };

  const calculateNights = (inDate: string, outDate: string) => {
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diff = Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));
    return isNaN(diff) ? 1 : diff;
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBooking) return;

    try {
      const newGuest = await api.createGuest({
        fullName,
        email,
        phone,
        idType: 'Online Reservation',
        idNumber: `WEB-${Math.floor(10000 + Math.random() * 90000)}`,
        address: 'Online Guest Booking',
        nationality: 'Filipino',
        isVip: false,
        notes: specialRequests,
      });

      const nights = calculateNights(checkInDate, checkOutDate);

      const newRes = await api.createReservation({
        guestId: newGuest.id,
        roomId: selectedRoomForBooking.id,
        checkInDate,
        checkOutDate,
        nights,
        adults: Number(adults),
        children: 0,
        specialRequests,
      });

      setBookingSuccessData({
        reservationCode: newRes.reservationCode,
        guestName: fullName,
        guestEmail: email,
        guestPhone: phone,
        roomNumber: selectedRoomForBooking.number,
        roomType: selectedRoomForBooking.type,
        checkInDate,
        checkOutDate,
        nights,
        totalAmount: newRes.totalAmount,
      });

      setSelectedRoomForBooking(null);
      setFullName('');
      setEmail('');
      setPhone('+63 ');
      setSpecialRequests('');
      loadRooms();
    } catch (err: any) {
      alert(`Reservation Error: ${err.message}`);
    }
  };

  const filteredRooms = rooms.filter((r) => selectedType === 'All' || r.type === selectedType);

  const estimatedNights = selectedRoomForBooking
    ? calculateNights(checkInDate, checkOutDate)
    : 1;
  const estimatedTotal = selectedRoomForBooking
    ? selectedRoomForBooking.ratePerNight * estimatedNights
    : 0;

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#1C1B18] font-sans relative select-none">
      {/* Japandi Custom 3D Figma Mouse Cursor */}
      <CustomCursor />

      {/* Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-8 py-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <Logo size={32} className="shrink-0" />
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-[#111111] flex items-center gap-1.5 font-sans">
              ARL's Hotel
              <span className="px-2 py-0.2 bg-[#AE9170]/15 text-[#AE9170] text-[9px] font-bold rounded uppercase tracking-widest border border-[#AE9170]/30 font-sans">
                LUXURY
              </span>
            </h1>
            <p className="text-[11px] text-[#666666] font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#C84B31]" /> Coastal Sanctuary
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-black/5 rounded-full text-xs font-semibold text-[#333333]">
            <Sun className="w-3.5 h-3.5 text-[#D97706]" /> 26°C Clear • Manila
          </div>

          <button
            onClick={onGoToAdmin}
            className="px-5 py-2.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-full flex items-center gap-2 transition-all shadow-md hover:scale-105"
          >
            <Lock className="w-3.5 h-3.5 text-[#C84B31]" /> Staff Admin Portal
          </button>
        </div>
      </header>

      {/* SECTION 1: Full-Size Immersive Luxury Hotel Background Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Full Size Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80"
            alt="Luxury Hotel Resort"
            className="w-full h-full object-cover object-center"
          />
          {/* Ambient Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/40" />
        </div>

        {/* Hero Content Grid: Extra-Big Side Logo (No Box or Border) */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-white">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-[#AE9170] shadow-lg">
              <Sparkles className="w-4 h-4 text-[#AE9170]" /> 5-Star Luxury Oceanfront Resort & Spa
            </div>

            <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-white">
              Serenity, Precision & Oceanfront Luxury.
            </h2>

            <p className="text-base text-white/80 font-medium max-w-xl leading-relaxed">
              Experience handcrafted luxury suites, relaxation sanctuaries, organic cotton duvets, and 24/7 personalized concierge service.
            </p>
          </div>

          {/* Right Column: EXTRA-BIG Side LOGO.svg (340px, Pure Vector, No Background Box or Border) */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <div className="transform hover:scale-105 transition-transform duration-500">
              <Logo size={340} className="filter drop-shadow-[0_0_35px_rgba(174,145,112,0.8)]" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Room Showcase Grid & Relocated Category Selection Bar */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        {/* Category Selection Bar Header & Segmented Pill Switcher */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/5 text-xs font-bold text-[#C84B31]">
            <Building2 className="w-3.5 h-3.5" /> Room & Suite Directory
          </div>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            Explore Our Luxury Suites & Accommodations
          </h3>

          {/* Apple Segmented Control Category Filter Switcher */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <div className="p-1.5 bg-black/5 backdrop-blur-md rounded-2xl flex items-center gap-1.5 border border-black/5 shadow-inner">
              {['All', 'Standard', 'Deluxe', 'Suite', 'Presidential'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    selectedType === t
                      ? 'bg-[#111111] text-white shadow-md scale-100'
                      : 'text-[#666666] hover:text-[#111111] hover:bg-white/60'
                  }`}
                >
                  {t === 'All' ? 'All Suites' : `${t} Class`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Room Showcase Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRooms.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white/80 backdrop-blur-md rounded-3xl border border-black/5 text-sm text-[#666666] font-medium">
              No suites currently available in this category.
            </div>
          ) : (
            filteredRooms.map((room) => (
              <div
                key={room.id}
                className="bg-white/90 backdrop-blur-xl rounded-3xl border border-black/5 shadow-xl overflow-hidden flex flex-col justify-between hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 group"
              >
                <div>
                  {/* Smooth Zooming Image */}
                  <div className="relative h-64 w-full overflow-hidden bg-neutral-900">
                    <img
                      src={room.image || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'}
                      alt={`Room ${room.number}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full font-mono shadow-md">
                      Suite {room.number}
                    </div>
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md text-[#C84B31] text-xs font-extrabold px-3.5 py-1 rounded-full border border-black/5 shadow-md">
                      {room.type}
                    </div>
                  </div>

                  {/* Room Body */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-[#C84B31]" /> {room.bedType}
                      </span>
                      <span className="text-xs text-[#666666] font-medium flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Max {room.capacity} Guests
                      </span>
                    </div>

                    <p className="text-xs text-[#666666] line-clamp-2 font-medium leading-relaxed">
                      {room.description || 'Pristine luxury guest suite with premium organic linens and rain shower.'}
                    </p>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {room.amenities &&
                        room.amenities.map((a, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-black/5 text-[#444444] text-[10px] font-bold rounded-lg"
                          >
                            {a}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Footer Pricing & Action */}
                <div className="p-6 pt-0 border-t border-black/5 mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-[#888888] tracking-wider block">Nightly Rate</span>
                    <span className="text-xl font-black text-[#111111]">{formatCurrency(room.ratePerNight)}</span>
                  </div>

                  <button
                    onClick={() => handleOpenBookingModal(room)}
                    disabled={room.status !== 'Available'}
                    className="px-5 py-3 bg-[#C84B31] hover:bg-[#B43F27] text-white text-xs font-bold rounded-full transition-all shadow-md hover:scale-105 disabled:opacity-40"
                  >
                    {room.status === 'Available' ? 'Reserve Suite' : room.status}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Reservation Form Modal */}
      <Modal
        isOpen={!!selectedRoomForBooking}
        onClose={() => setSelectedRoomForBooking(null)}
        title={`Reserve Suite ${selectedRoomForBooking?.number} — ${selectedRoomForBooking?.type} Class`}
        subtitle="Complete stay schedule and contact details for reservation"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitReservation} className="space-y-4 text-xs">
          <div className="p-4 bg-[#F5F2EC] rounded-2xl border border-black/5 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[#666666] font-semibold">Nightly Rate: </span>
              <span className="font-bold text-[#111111]">{formatCurrency(selectedRoomForBooking?.ratePerNight || 0)}</span>
            </div>
            <div>
              <span className="text-[#666666] font-semibold">Estimated Total ({estimatedNights} night/s): </span>
              <span className="font-black text-[#C84B31] text-base">{formatCurrency(estimatedTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 zen-input text-xs text-[#111111] rounded-xl"
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#111111] mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 zen-input text-xs text-[#111111] rounded-xl"
                placeholder="juan@example.ph"
              />
            </div>
            <div>
              <label className="block font-bold text-[#111111] mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 zen-input text-xs text-[#111111] rounded-xl"
                placeholder="+63 917 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#111111] mb-1">Check-In Date *</label>
              <input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full px-4 py-2.5 zen-input text-xs text-[#111111] rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-[#111111] mb-1">Check-Out Date *</label>
              <input
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-4 py-2.5 zen-input text-xs text-[#111111] rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">Adult Guests *</label>
            <input
              type="number"
              min={1}
              max={selectedRoomForBooking?.capacity || 6}
              required
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="w-full px-4 py-2.5 zen-input text-xs text-[#111111] rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">Special Requests & Airport Pickup</label>
            <textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full px-4 py-2.5 zen-input text-xs text-[#111111] rounded-xl"
              placeholder="e.g. High floor, quiet suite away from elevator"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
            <button
              type="button"
              onClick={() => setSelectedRoomForBooking(null)}
              className="px-5 py-2.5 zen-btn text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#C84B31] hover:bg-[#B43F27] text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              Submit Booking Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Ticket Modal */}
      <Modal
        isOpen={!!bookingSuccessData}
        onClose={() => setBookingSuccessData(null)}
        title="Reservation Request Submitted Successfully"
        subtitle="Thank you for choosing ARL's Hotel"
        maxWidth="md"
      >
        <div className="space-y-5 text-xs text-[#111111]">
          <div className="p-5 bg-[#EBF5EF] border border-[#BCE3C8] rounded-2xl text-[#2D5A39] space-y-2 text-center">
            <div className="w-12 h-12 rounded-full bg-[#4A7C59] text-white mx-auto flex items-center justify-center font-bold shadow-md">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-black">Reservation Code: {bookingSuccessData?.reservationCode}</h4>
            <p className="text-xs font-medium leading-relaxed">
              Your booking request has been registered! Our front desk concierge will email you at{' '}
              <span className="font-bold">{bookingSuccessData?.guestEmail}</span> or call{' '}
              <span className="font-bold">{bookingSuccessData?.guestPhone}</span> shortly to confirm stay details.
            </p>
          </div>

          <div className="space-y-2 border-t border-black/5 pt-3">
            <div className="flex justify-between py-1.5 border-b border-black/5">
              <span className="text-[#666666]">Guest Name:</span>
              <span className="font-bold text-[#111111]">{bookingSuccessData?.guestName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-black/5">
              <span className="text-[#666666]">Assigned Suite:</span>
              <span className="font-bold text-[#C84B31]">Room {bookingSuccessData?.roomNumber} ({bookingSuccessData?.roomType})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-black/5">
              <span className="text-[#666666]">Stay Duration:</span>
              <span className="font-bold">{bookingSuccessData?.nights} night(s)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#666666]">Total Amount:</span>
              <span className="font-black text-[#C84B31] text-base">{formatCurrency(bookingSuccessData?.totalAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-black/5">
            <button
              onClick={() => setBookingSuccessData(null)}
              className="px-6 py-2.5 bg-[#C84B31] text-white text-xs font-bold rounded-xl shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-white py-10 px-8 text-center text-xs text-[#666666]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span>© 2026 ARL's Hotel — Luxury Resort & Spa. All rights reserved.</span>
          </div>
          <button
            onClick={onGoToAdmin}
            className="text-[#C84B31] font-extrabold hover:underline flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" /> Staff Admin Portal Login
          </button>
        </div>
      </footer>
    </div>
  );
};
