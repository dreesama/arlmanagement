import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Download, BedDouble, Layers, Users, Image as ImageIcon, Upload } from 'lucide-react';
import { Room, RoomType, RoomStatus } from '../types';
import { api } from '../lib/api';
import { formatCurrency, getRoomStatusBadge } from '../lib/utils';
import { exportToExcel } from '../utils/exports';
import { Modal } from '../components/ui/Modal';

// Preset Authentic Hotel Room Interior Photography
const PRESET_ROOM_PHOTOS = [
  { label: 'Standard Zen Bedroom', url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Boutique Ground Studio', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Deluxe Balcony Suite', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Executive Penthouse Suite', url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Presidential Master Bedroom', url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80' },
];

export const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form Fields
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState<number>(1);
  const [type, setType] = useState<RoomType>('Standard');
  const [bedType, setBedType] = useState('Queen');
  const [capacity, setCapacity] = useState<number>(2);
  const [ratePerNight, setRatePerNight] = useState<number>(2500);
  const [status, setStatus] = useState<RoomStatus>('Available');
  const [amenitiesInput, setAmenitiesInput] = useState('WiFi, AC, Smart TV, Mini Fridge');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

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

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setNumber('');
    setFloor(1);
    setType('Standard');
    setBedType('Queen');
    setCapacity(2);
    setRatePerNight(2500);
    setStatus('Available');
    setAmenitiesInput('WiFi, AC, Smart TV, Mini Fridge');
    setDescription('');
    setImage(PRESET_ROOM_PHOTOS[0].url);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (room: Room) => {
    setEditingRoom(room);
    setNumber(room.number);
    setFloor(room.floor);
    setType(room.type);
    setBedType(room.bedType);
    setCapacity(room.capacity);
    setRatePerNight(room.ratePerNight);
    setStatus(room.status);
    setAmenitiesInput(room.amenities ? room.amenities.join(', ') : '');
    setDescription(room.description || '');
    setImage(room.image || PRESET_ROOM_PHOTOS[0].url);
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const amenitiesArr = amenitiesInput.split(',').map((s) => s.trim()).filter(Boolean);
    const roomPayload = {
      number,
      floor: Number(floor),
      type,
      bedType,
      capacity: Number(capacity),
      ratePerNight: Number(ratePerNight),
      status,
      amenities: amenitiesArr,
      description,
      image,
    };

    try {
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, roomPayload);
      } else {
        await api.createRoom(roomPayload);
      }
      setIsModalOpen(false);
      loadRooms();
    } catch (err: any) {
      alert(`Error saving room: ${err.message}`);
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (confirm('Are you sure you want to delete this room?')) {
      try {
        await api.deleteRoom(id);
        loadRooms();
      } catch (err: any) {
        alert(`Error deleting room: ${err.message}`);
      }
    }
  };

  const handleQuickStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.updateRoomStatus(id, newStatus);
      loadRooms();
    } catch (err: any) {
      alert(`Error changing status: ${err.message}`);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bedType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || r.type === selectedType;
    const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleExportExcel = () => {
    const dataToExport = filteredRooms.map((r) => ({
      'Room Number': r.number,
      Floor: r.floor,
      Type: r.type,
      'Bed Type': r.bedType,
      Capacity: `${r.capacity} Persons`,
      'Rate Per Night (PHP)': r.ratePerNight,
      Status: r.status,
      Amenities: r.amenities?.join(', ') || '',
    }));
    exportToExcel(dataToExport, 'ARL_Hotel_Rooms_Export');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="zen-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B18] tracking-tight">Room Inventory & Management</h2>
          <p className="text-xs text-[#6E6B65] font-medium">Total {rooms.length} rooms registered in system database</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 zen-btn rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-[#6E6B65]" /> Export Excel
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 zen-btn-primary rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="zen-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6B65]" />
          <input
            type="text"
            placeholder="Search room #, type, bed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 zen-input text-xs text-[#1C1B18] placeholder-[#6E6B65]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#6E6B65] font-semibold">
            <Filter className="w-3.5 h-3.5" /> Type:
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="zen-input text-xs text-[#1C1B18] rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="Standard">Standard</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
            <option value="Presidential">Presidential</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[#6E6B65] font-semibold ml-2">
            Status:
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="zen-input text-xs text-[#1C1B18] rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Reserved">Reserved</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="zen-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1B18] table-fixed">
            <thead className="bg-[#F5F2EC] text-[#6E6B65] font-bold border-b border-[#E5E0D8]">
              <tr>
                <th className="px-4 py-3.5 w-44">Room & Interior Photo</th>
                <th className="px-4 py-3.5 w-24">Floor</th>
                <th className="px-4 py-3.5 w-32">Classification</th>
                <th className="px-4 py-3.5 w-40">Bed & Capacity</th>
                <th className="px-4 py-3.5 w-36">Rate / Night</th>
                <th className="px-4 py-3.5 w-40">Status Dropdown</th>
                <th className="px-4 py-3.5">Amenities</th>
                <th className="px-4 py-3.5 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8] bg-white">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#6E6B65] font-medium">
                    No rooms found matching your search.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-[#F5F2EC]/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={room.image || PRESET_ROOM_PHOTOS[0].url}
                          alt={`Room ${room.number}`}
                          className="w-14 h-10 rounded-lg object-cover border border-[#E5E0D8] shrink-0"
                        />
                        <div>
                          <div className="inline-flex items-center gap-1.5 text-[#C84B31] font-mono text-xs font-bold">
                            <BedDouble className="w-3.5 h-3.5" />
                            Room {room.number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#6E6B65] font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#6E6B65]" /> Floor {room.floor}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-white border border-[#E5E0D8] text-[#1C1B18] font-bold">
                        {room.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#1C1B18] font-medium">
                      <div>{room.bedType}</div>
                      <div className="text-[10px] text-[#6E6B65] font-semibold flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-[#6E6B65]" /> Max {room.capacity} Guests
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#1C1B18] text-sm">
                      {formatCurrency(room.ratePerNight)}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={room.status}
                        onChange={(e) => handleQuickStatusChange(room.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border focus:outline-none cursor-pointer w-32 ${getRoomStatusBadge(
                          room.status
                        )}`}
                      >
                        <option value="Available">Available</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {room.amenities && room.amenities.length > 0 ? (
                          room.amenities.slice(0, 3).map((a, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-[#F5F2EC] border border-[#E5E0D8] text-[#6E6B65] rounded text-[10px] font-medium"
                            >
                              {a}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#6E6B65] text-[11px]">Standard Amenities</span>
                        )}
                        {room.amenities && room.amenities.length > 3 && (
                          <span className="px-1.5 py-0.5 bg-[#F5F2EC] border border-[#E5E0D8] text-[#C84B31] rounded text-[10px] font-bold">
                            +{room.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(room)}
                          className="p-1.5 rounded-lg text-[#6E6B65] hover:text-[#C84B31] hover:bg-[#F5F2EC] transition-colors border border-[#E5E0D8]"
                          title="Edit Room"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-1.5 rounded-lg text-[#6E6B65] hover:text-rose-600 hover:bg-rose-50 transition-colors border border-[#E5E0D8]"
                          title="Delete Room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Room Modal with Image Upload */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? `Edit Room ${editingRoom.number}` : 'Add New Room'}
        subtitle="Specify room details, upload photo, rate, and amenities"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div className="p-4 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] space-y-3">
            <label className="block text-xs font-bold text-[#1C1B18] flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#C84B31]" /> Room Interior Photo Upload & Gallery
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-36 h-24 rounded-lg bg-white border border-[#E5E0D8] overflow-hidden shrink-0 relative flex items-center justify-center">
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-[#6E6B65]">No Photo</span>
                )}
              </div>

              <div className="space-y-2 flex-1 w-full">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 zen-btn text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#C84B31]" /> Upload Image File
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <span className="text-[10px] text-[#6E6B65]">JPG, PNG, WebP</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6E6B65] mb-1">Or Choose Preset Hotel Suite Photo:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ROOM_PHOTOS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImage(p.url)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                          image === p.url
                            ? 'bg-[#C84B31] text-white border-[#C84B31]'
                            : 'bg-white text-[#1C1B18] border-[#E5E0D8] hover:bg-[#F5F2EC]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
                placeholder="e.g. 101"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Floor Level *</label>
              <input
                type="number"
                required
                min={1}
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Room Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RoomType)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              >
                <option value="Standard">Standard</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Suite">Suite</option>
                <option value="Presidential">Presidential</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Bed Configuration *</label>
              <input
                type="text"
                required
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
                placeholder="e.g. King, Twin Queen"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Max Capacity *</label>
              <input
                type="number"
                required
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Rate per Night (₱) *</label>
              <input
                type="number"
                required
                min={0}
                value={ratePerNight}
                onChange={(e) => setRatePerNight(Number(e.target.value))}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomStatus)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Amenities (comma-separated)</label>
            <input
              type="text"
              value={amenitiesInput}
              onChange={(e) => setAmenitiesInput(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="WiFi, Aircon, TV, Bathtub, Ocean View"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Room Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="Brief description of the room layout, view, etc."
            />
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
              {editingRoom ? 'Update Room' : 'Save Room'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
