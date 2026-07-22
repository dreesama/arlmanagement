import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Download, Star, Mail, Phone } from 'lucide-react';
import { Guest } from '../types';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { exportToExcel } from '../utils/exports';
import { Modal } from '../components/ui/Modal';

export const Guests: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('Passport');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [nationality, setNationality] = useState('Filipino');
  const [isVip, setIsVip] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const data = await api.getGuests();
      setGuests(data);
    } catch (err) {
      console.error('Failed to load guests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingGuest(null);
    setFullName('');
    setEmail('');
    setPhone('+63 ');
    setIdType('Passport');
    setIdNumber('');
    setAddress('');
    setNationality('Filipino');
    setIsVip(false);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setFullName(guest.fullName);
    setEmail(guest.email);
    setPhone(guest.phone);
    setIdType(guest.idType);
    setIdNumber(guest.idNumber);
    setAddress(guest.address);
    setNationality(guest.nationality);
    setIsVip(guest.isVip);
    setNotes(guest.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullName,
      email,
      phone,
      idType,
      idNumber,
      address,
      nationality,
      isVip,
      notes,
    };

    try {
      if (editingGuest) {
        await api.updateGuest(editingGuest.id, payload);
      } else {
        await api.createGuest(payload);
      }
      setIsModalOpen(false);
      loadGuests();
    } catch (err: any) {
      alert(`Error saving guest: ${err.message}`);
    }
  };

  const handleDeleteGuest = async (id: number) => {
    if (confirm('Are you sure you want to remove this guest profile?')) {
      try {
        await api.deleteGuest(id);
        loadGuests();
      } catch (err: any) {
        alert(`Error deleting guest: ${err.message}`);
      }
    }
  };

  const filteredGuests = guests.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.fullName.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.phone.toLowerCase().includes(q) ||
      g.idNumber.toLowerCase().includes(q) ||
      g.nationality.toLowerCase().includes(q)
    );
  });

  const handleExportExcel = () => {
    const dataToExport = filteredGuests.map((g) => ({
      'Full Name': g.fullName,
      Email: g.email,
      Phone: g.phone,
      'ID Type': g.idType,
      'ID Number': g.idNumber,
      Address: g.address,
      Nationality: g.nationality,
      'VIP Status': g.isVip ? 'YES' : 'NO',
      Notes: g.notes || '',
      'Registered Date': g.createdAt,
    }));
    exportToExcel(dataToExport, 'ARL_Hotel_Guests_Export');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="zen-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B18] tracking-tight">Guest Profiles & Information</h2>
          <p className="text-xs text-[#6E6B65] font-medium">Total {guests.length} registered guest profiles</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 zen-btn rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-[#6E6B65]" /> Export Excel
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 zen-btn-primary rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> Add Guest Profile
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="zen-card p-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6B65]" />
          <input
            type="text"
            placeholder="Search name, email, phone, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 zen-input text-xs text-[#1C1B18] placeholder-[#6E6B65]"
          />
        </div>
      </div>

      {/* Elegant Data Table Container */}
      <div className="zen-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1B18] table-fixed">
            <thead className="bg-[#F5F2EC] text-[#6E6B65] font-bold border-b border-[#E5E0D8]">
              <tr>
                <th className="px-4 py-3.5 w-48">Guest Name</th>
                <th className="px-4 py-3.5 w-48">Contact Info</th>
                <th className="px-4 py-3.5 w-36">Identity Document</th>
                <th className="px-4 py-3.5 w-32">Nationality</th>
                <th className="px-4 py-3.5 w-32">Status</th>
                <th className="px-4 py-3.5 w-32">Registered</th>
                <th className="px-4 py-3.5 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8] bg-white">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#6E6B65] font-medium">
                    No guest profiles found matching your search.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-[#F5F2EC]/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-[#E5E0D8] flex items-center justify-center font-bold text-[#C84B31] text-xs shrink-0">
                          {g.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#1C1B18] flex items-center gap-1.5 truncate">
                            {g.fullName}
                            {g.isVip && (
                              <span className="bg-[#FEF7EC] text-[#9A6208] border border-[#FCE1B6] px-1.5 py-0.2 text-[9px] font-bold rounded flex items-center gap-0.5 shrink-0">
                                <Star className="w-2.5 h-2.5 fill-[#D97706]" /> VIP
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#6E6B65] font-medium truncate">{g.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 space-y-0.5">
                      <div className="text-[#1C1B18] font-semibold flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 text-[#6E6B65]" /> {g.email}
                      </div>
                      <div className="text-[#6E6B65] text-[11px] font-medium flex items-center gap-1 truncate">
                        <Phone className="w-3 h-3 text-[#6E6B65]" /> {g.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#1C1B18]">{g.idType}</div>
                      <div className="font-mono text-[10px] text-[#6E6B65] font-semibold">{g.idNumber}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[#1C1B18] font-semibold">{g.nationality}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#EBF5EF] text-[#2D5A39] border border-[#BCE3C8]">
                        Active Profile
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#6E6B65] font-medium">{formatDate(g.createdAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(g)}
                          className="p-1.5 rounded-lg text-[#6E6B65] hover:text-[#C84B31] hover:bg-[#F5F2EC] transition-colors border border-[#E5E0D8]"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGuest(g.id)}
                          className="p-1.5 rounded-lg text-[#6E6B65] hover:text-rose-600 hover:bg-rose-50 transition-colors border border-[#E5E0D8]"
                          title="Delete Profile"
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

      {/* Add / Edit Guest Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGuest ? `Edit Guest: ${editingGuest.fullName}` : 'Register New Guest Profile'}
        subtitle="Specify personal information, contact records, and identification"
      >
        <form onSubmit={handleSaveGuest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
                placeholder="juan@example.ph"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
                placeholder="+63 917 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">ID Document Type *</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              >
                <option value="PhilSys ID">PhilSys ID (National ID)</option>
                <option value="Passport">Passport</option>
                <option value="Driver License">Driver's License</option>
                <option value="SSS / UMID">SSS / UMID</option>
                <option value="PRC License">PRC License</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">ID Number / Reference *</label>
              <input
                type="text"
                required
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
                placeholder="ID Number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
                placeholder="City, Province"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
                placeholder="Filipino"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8]">
            <input
              type="checkbox"
              id="isVip"
              checked={isVip}
              onChange={(e) => setIsVip(e.target.checked)}
              className="w-4 h-4 accent-[#C84B31] rounded cursor-pointer"
            />
            <label htmlFor="isVip" className="text-xs text-[#1C1B18] cursor-pointer font-bold flex items-center gap-1">
              Mark guest as VIP (10% discount eligible)
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Preferences & Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="e.g. Preferred room location, food allergies"
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
              {editingGuest ? 'Update Profile' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
