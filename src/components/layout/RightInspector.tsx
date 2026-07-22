import React, { useEffect, useState } from 'react';
import {
  BedDouble,
  Maximize2,
  RefreshCw,
  Bell,
  Sun,
  Key,
  User,
  ShieldCheck,
  CalendarCheck,
  Plus,
  ArrowRight,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Room, Reservation } from '../../types';
import { formatCurrency, formatDate, getReservationStatusBadge, getRoomStatusBadge } from '../../lib/utils';
import { Modal } from '../ui/Modal';

interface RightInspectorProps {
  onNavigate: (tab: string) => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({ onNavigate }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Interactive Calendar State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [roomData, resData] = await Promise.all([api.getRooms(), api.getReservations()]);
      setRooms(roomData);
      setReservations(resData);
    } catch (e) {
      console.error(e);
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

  const availableCount = rooms.filter((r) => r.status === 'Available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'Occupied').length;
  const reservedCount = rooms.filter((r) => r.status === 'Reserved').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'Maintenance').length;

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  const get2DRoomTileClass = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-[#EBF5EF] hover:bg-[#DDF0E4] border-[#BCE3C8] text-[#2D5A39]';
      case 'Occupied':
        return 'bg-[#EEF2F6] hover:bg-[#DEE6F0] border-[#C3D2E5] text-[#2C4366]';
      case 'Reserved':
        return 'bg-[#FEF7EC] hover:bg-[#FDEED5] border-[#FCE1B6] text-[#9A6208]';
      case 'Maintenance':
        return 'bg-[#FDF2F0] hover:bg-[#FCE3E0] border-[#F8C8C1] text-[#992E1B]';
      default:
        return 'bg-white border-[#E5E0D8] text-[#1C1B18]';
    }
  };

  // Calendar Calculation Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectedDateBookings = reservations.filter(
    (r) =>
      r.checkInDate <= selectedDateStr &&
      r.checkOutDate >= selectedDateStr &&
      r.status !== 'Cancelled'
  );

  return (
    <aside className="w-80 bg-white border-l border-[#E5E0D8] flex flex-col h-full overflow-y-auto hidden xl:flex shrink-0">
      {/* Refined Japandi Header */}
      <div className="p-4 border-b border-[#E5E0D8] flex items-center justify-between bg-[#F5F2EC]/40">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-[#C84B31]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B18]">Operations & Schedule Desk</h3>
        </div>
        <button
          onClick={loadData}
          className="p-1 text-[#6E6B65] hover:text-[#1C1B18] transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Selected Room Deep Inspector Box */}
        {selectedRoom && (
          <div className="zen-card p-4 space-y-3 bg-[#F5F2EC]/60 border-[#C84B31]">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
              <span className="text-xs font-bold text-[#1C1B18] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C84B31]" /> Room {selectedRoom.number} Details
              </span>
              <button
                onClick={() => setSelectedRoom(null)}
                className="p-0.5 rounded hover:bg-[#E5E0D8] text-[#6E6B65]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedRoom.image && (
              <div className="w-full h-32 rounded-lg overflow-hidden border border-[#E5E0D8]">
                <img src={selectedRoom.image} alt={`Room ${selectedRoom.number}`} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="text-xs space-y-1">
              <div className="flex justify-between font-bold text-[#1C1B18]">
                <span>{selectedRoom.type} Class</span>
                <span className="text-[#C84B31]">{formatCurrency(selectedRoom.ratePerNight)}/night</span>
              </div>
              <div className="text-[11px] text-[#6E6B65] font-medium">{selectedRoom.bedType} • Max {selectedRoom.capacity} Guests</div>
              <div className="text-[11px] text-[#6E6B65] italic">{selectedRoom.description}</div>
            </div>
          </div>
        )}

        {/* 1. Interactive Monthly Calendar Widget */}
        <div className="zen-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-xs font-bold text-[#1C1B18]">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded hover:bg-[#F5F2EC] text-[#6E6B65] border border-[#E5E0D8]"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded hover:bg-[#F5F2EC] text-[#6E6B65] border border-[#E5E0D8]"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#6E6B65] uppercase">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDay = String(dayNum).padStart(2, '0');
              const formattedMonth = String(month + 1).padStart(2, '0');
              const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;

              const hasCheckIn = reservations.some(
                (r) => r.checkInDate === dateStr && r.status !== 'Cancelled'
              );
              const hasCheckOut = reservations.some(
                (r) => r.checkOutDate === dateStr && r.status !== 'Cancelled'
              );

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-7 rounded-md font-semibold text-xs relative flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#C84B31] text-white font-bold shadow-xs'
                      : isToday
                      ? 'bg-[#F5F2EC] text-[#C84B31] border border-[#C84B31] font-bold'
                      : 'hover:bg-[#F5F2EC] text-[#1C1B18]'
                  }`}
                >
                  <span>{dayNum}</span>
                  <div className="absolute bottom-0.5 flex gap-0.5 justify-center">
                    {hasCheckIn && <span className="w-1 h-1 rounded-full bg-[#4A7C59]"></span>}
                    {hasCheckOut && <span className="w-1 h-1 rounded-full bg-[#3D5A80]"></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Scheduled Stay Agenda List for Selected Date */}
        <div className="zen-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-xs font-bold text-[#1C1B18]">
              Agenda for {formatDate(selectedDateStr)}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F2EC] text-[#C84B31] border border-[#E5E0D8]">
              {selectedDateBookings.length} Active
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {selectedDateBookings.length === 0 ? (
              <div className="py-4 text-center text-[#6E6B65] text-xs font-medium bg-[#F5F2EC]/40 rounded-lg border border-dashed border-[#E5E0D8]">
                No guest stays active on this date.
              </div>
            ) : (
              selectedDateBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 bg-[#F5F2EC]/50 rounded-lg border border-[#E5E0D8] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1C1B18]">{b.guestName}</span>
                    <span className="font-mono text-[10px] text-[#C84B31] font-bold">Room {b.roomNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#6E6B65]">
                    <span>{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold border ${getReservationStatusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. 2D Room Floor Plan Grid Map */}
        <div className="zen-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-xs font-bold text-[#1C1B18] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#C84B31]" /> 2D Room Layout Map
            </span>
            <button
              onClick={() => setIsExpandModalOpen(true)}
              className="text-xs text-[#C84B31] hover:underline font-bold flex items-center gap-1"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Expand
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1.5 font-bold text-[#2D5A39] bg-[#EBF5EF] px-2 py-0.5 rounded border border-[#BCE3C8]">
              <span className="w-2 h-2 rounded-full bg-[#4A7C59]"></span> Available ({availableCount})
            </div>
            <div className="flex items-center gap-1.5 font-bold text-[#2C4366] bg-[#EEF2F6] px-2 py-0.5 rounded border border-[#C3D2E5]">
              <span className="w-2 h-2 rounded-full bg-[#3D5A80]"></span> Occupied ({occupiedCount})
            </div>
            <div className="flex items-center gap-1.5 font-bold text-[#9A6208] bg-[#FEF7EC] px-2 py-0.5 rounded border border-[#FCE1B6]">
              <span className="w-2 h-2 rounded-full bg-[#D97706]"></span> Reserved ({reservedCount})
            </div>
            <div className="flex items-center gap-1.5 font-bold text-[#992E1B] bg-[#FDF2F0] px-2 py-0.5 rounded border border-[#F8C8C1]">
              <span className="w-2 h-2 rounded-full bg-[#C84B31]"></span> Maint. ({maintenanceCount})
            </div>
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 pt-1">
            {floors.map((floorNum) => (
              <div key={floorNum} className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E6B65]">
                  Floor {floorNum}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {rooms
                    .filter((r) => r.floor === floorNum)
                    .map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${get2DRoomTileClass(
                          room.status
                        )}`}
                        title={`Room ${room.number} - ${room.type} (${room.status})`}
                      >
                        <span className="font-mono text-xs font-bold">{room.number}</span>
                        <span className="text-[9px] font-semibold truncate max-w-full">{room.type.substring(0, 4)}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Express Action Station */}
        <div className="zen-card p-4 space-y-2.5">
          <div className="text-xs font-bold text-[#1C1B18] border-b border-[#E5E0D8] pb-2">
            Quick Action Station
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onNavigate('checkinout')}
              className="w-full py-2 px-3 zen-btn-primary text-xs font-bold flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> Check-In / Out Desk
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('reservations')}
              className="w-full py-2 px-3 zen-btn text-xs font-bold flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#C84B31]" /> Create Reservation
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#6E6B65]" />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable High-Res 2D Floor Plan Modal */}
      <Modal
        isOpen={isExpandModalOpen}
        onClose={() => setIsExpandModalOpen(false)}
        title="Hotel 2D Floor Plan & Room Inventory Matrix"
        subtitle={`Total ${rooms.length} rooms registered in system database`}
        maxWidth="4xl"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8]">
            <div className="text-xs font-bold text-[#1C1B18]">Status Color Codes:</div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#EBF5EF] border border-[#BCE3C8] rounded font-bold text-[#2D5A39]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4A7C59]"></span> Available ({availableCount})
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#EEF2F6] border border-[#C3D2E5] rounded font-bold text-[#2C4366]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3D5A80]"></span> Occupied ({occupiedCount})
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FEF7EC] border border-[#FCE1B6] rounded font-bold text-[#9A6208]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span> Reserved ({reservedCount})
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FDF2F0] border border-[#F8C8C1] rounded font-bold text-[#992E1B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C84B31]"></span> Maintenance ({maintenanceCount})
              </div>
            </div>
          </div>

          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {floors.map((floorNum) => (
              <div key={floorNum} className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#6E6B65] border-b border-[#E5E0D8] pb-1">
                  Floor {floorNum} Rooms
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {rooms
                    .filter((r) => r.floor === floorNum)
                    .map((room) => (
                      <div
                        key={room.id}
                        onClick={() => {
                          setSelectedRoom(room);
                          setIsExpandModalOpen(false);
                        }}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 transition-all cursor-pointer ${get2DRoomTileClass(
                          room.status
                        )}`}
                      >
                        {room.image && (
                          <div className="w-full h-20 rounded-lg overflow-hidden border border-[#E5E0D8] mb-1">
                            <img src={room.image} alt={`Room ${room.number}`} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-sm font-bold">Room {room.number}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-[#E5E0D8]">
                            {room.type}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium opacity-90">
                          <div>{room.bedType}</div>
                          <div className="font-bold mt-0.5">{formatCurrency(room.ratePerNight)}/night</div>
                        </div>
                        <div className="pt-1 border-t border-[#E5E0D8]/60 text-[10px] font-bold uppercase tracking-wider">
                          Status: {room.status}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </aside>
  );
};
