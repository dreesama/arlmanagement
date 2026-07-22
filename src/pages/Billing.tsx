import React, { useEffect, useState } from 'react';
import { CreditCard, Printer, Download, Plus, Search, CheckCircle, Building2 } from 'lucide-react';
import { Billing, BillingItem, PaymentMethod } from '../types';
import { api } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, getPaymentStatusBadge } from '../lib/utils';
import { exportElementToPDF, exportToExcel, printInvoice } from '../utils/exports';
import { Modal } from '../components/ui/Modal';

export const BillingPage: React.FC = () => {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Billing | null>(null);

  // Payment Recording Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Edit Charges / Discount Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [extraItems, setExtraItems] = useState<BillingItem[]>([]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number>(500);

  useEffect(() => {
    loadBillings();
  }, []);

  const loadBillings = async () => {
    setLoading(true);
    try {
      const data = await api.getBillings();
      setBillings(data);
      if (data.length > 0) setSelectedInvoice(data[0]);
    } catch (err) {
      console.error('Failed to load billings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = async (b: Billing) => {
    try {
      const fresh = await api.getBillingById(b.id);
      setSelectedInvoice(fresh);
    } catch (e) {
      setSelectedInvoice(b);
    }
  };

  const handleOpenPaymentModal = () => {
    if (!selectedInvoice) return;
    setPayAmount(selectedInvoice.balanceAmount);
    setPayMethod('Cash');
    setPayRef('');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      await api.recordPayment(selectedInvoice.id, {
        amount: Number(payAmount),
        method: payMethod,
        referenceNo: payRef,
        notes: payNotes,
      });
      setIsPaymentModalOpen(false);
      loadBillings();
      if (selectedInvoice) handleSelectInvoice(selectedInvoice);
    } catch (err: any) {
      alert(`Error recording payment: ${err.message}`);
    }
  };

  const handleOpenEditModal = () => {
    if (!selectedInvoice) return;
    setDiscountType(selectedInvoice.discountType || 'percentage');
    setDiscountValue(selectedInvoice.discountValue || 0);
    setExtraItems(selectedInvoice.items || []);
    setNewItemDesc('');
    setNewItemPrice(500);
    setIsEditModalOpen(true);
  };

  const handleAddLineItem = () => {
    if (!newItemDesc.trim()) return;
    setExtraItems([
      ...extraItems,
      { description: newItemDesc, quantity: 1, unitPrice: Number(newItemPrice), amount: Number(newItemPrice) },
    ]);
    setNewItemDesc('');
  };

  const handleRemoveLineItem = (idx: number) => {
    setExtraItems(extraItems.filter((_, i) => i !== idx));
  };

  const handleSaveBillingEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      await api.updateBilling(selectedInvoice.id, {
        discountType,
        discountValue: Number(discountValue),
        items: extraItems,
      });
      setIsEditModalOpen(false);
      loadBillings();
      if (selectedInvoice) handleSelectInvoice(selectedInvoice);
    } catch (err: any) {
      alert(`Error updating billing: ${err.message}`);
    }
  };

  const filteredBillings = billings.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.invoiceNumber.toLowerCase().includes(q) ||
      b.guestName.toLowerCase().includes(q) ||
      b.roomNumber.toLowerCase().includes(q)
    );
  });

  const handleExportExcel = () => {
    const dataToExport = filteredBillings.map((b) => ({
      'Invoice #': b.invoiceNumber,
      Guest: b.guestName,
      Room: b.roomNumber,
      'Room Charges': b.roomCharges,
      'Extra Charges': b.extraCharges,
      Subtotal: b.subtotal,
      '12% VAT': b.taxAmount,
      '10% Service Charge': b.serviceCharge,
      Discount: b.discountAmount,
      'Grand Total (PHP)': b.grandTotal,
      Paid: b.paidAmount,
      Balance: b.balanceAmount,
      Status: b.status,
    }));
    exportToExcel(dataToExport, 'ARL_Hotel_Billing_Export');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Toolbar */}
      <div className="zen-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B18] tracking-tight">Billing & Payment Settlement</h2>
          <p className="text-xs text-[#6E6B65] font-medium">Automatic computation for VAT, service charges, discounts & payments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 zen-btn rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-[#6E6B65]" /> Export Excel
          </button>
        </div>
      </div>

      {/* Main Grid: Left Invoices List, Right Invoice Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Invoice List */}
        <div className="lg:col-span-5 zen-card p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6B65]" />
            <input
              type="text"
              placeholder="Search invoice #, guest, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 zen-input text-xs text-[#1C1B18] placeholder-[#6E6B65]"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredBillings.map((b) => (
              <div
                key={b.id}
                onClick={() => handleSelectInvoice(b)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedInvoice?.id === b.id
                    ? 'bg-[#F5F2EC] border-[#C84B31]'
                    : 'bg-white border-[#E5E0D8] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#C84B31]">{b.invoiceNumber}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPaymentStatusBadge(b.status)}`}>
                    {b.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1C1B18]">{b.guestName}</span>
                  <span className="text-[#6E6B65] font-medium">Room {b.roomNumber}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-[#E5E0D8]">
                  <span className="text-[#6E6B65] font-medium">Grand Total:</span>
                  <span className="font-bold text-[#1C1B18] text-sm">{formatCurrency(b.grandTotal)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Detailed Invoice Folio */}
        <div className="lg:col-span-7 space-y-4">
          {selectedInvoice ? (
            <>
              {/* Action Toolbar */}
              <div className="zen-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenPaymentModal}
                    disabled={selectedInvoice.balanceAmount === 0}
                    className="px-4 py-2 zen-btn-primary rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-40"
                  >
                    <CreditCard className="w-4 h-4" /> Record Payment
                  </button>
                  <button
                    onClick={handleOpenEditModal}
                    className="px-3.5 py-2 zen-btn text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C84B31]" /> Adjust Charges & Discount
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportElementToPDF('printable-invoice', selectedInvoice.invoiceNumber)}
                    className="p-2 zen-btn text-xs font-bold flex items-center gap-1.5"
                    title="Export PDF"
                  >
                    <Download className="w-4 h-4 text-[#C84B31]" /> Export PDF
                  </button>
                  <button
                    onClick={printInvoice}
                    className="p-2 zen-btn text-xs font-bold flex items-center gap-1.5"
                    title="Print Invoice"
                  >
                    <Printer className="w-4 h-4 text-[#6E6B65]" /> Print
                  </button>
                </div>
              </div>

              {/* Printable Invoice Folio Container */}
              <div id="printable-invoice" className="zen-card p-8 space-y-6 text-[#1C1B18]">
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b border-[#E5E0D8] pb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-6 h-6 text-[#C84B31]" />
                      <h1 className="text-xl font-bold tracking-tight text-[#1C1B18]">ARL's Hotel</h1>
                    </div>
                    <p className="text-xs text-[#6E6B65] mt-1 font-medium">123 Coastal Boulevard, Hotel District</p>
                    <p className="text-xs text-[#6E6B65] font-medium">Tax ID / TIN: 009-887-654-000</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-[#C84B31] font-mono">{selectedInvoice.invoiceNumber}</h2>
                    <div className="text-xs text-[#6E6B65] font-medium mt-1">Date: {formatDate(selectedInvoice.createdAt)}</div>
                    <div className="mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPaymentStatusBadge(selectedInvoice.status)}`}>
                        FOLIO STATUS: {selectedInvoice.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Guest Info Box */}
                <div className="grid grid-cols-2 gap-6 bg-[#F5F2EC] p-4 rounded-xl border border-[#E5E0D8] text-xs">
                  <div>
                    <span className="text-[#6E6B65] font-bold block mb-1">BILLED TO:</span>
                    <div className="font-bold text-[#1C1B18] text-sm">{selectedInvoice.guestName}</div>
                    <div className="text-[#6E6B65] mt-0.5 font-medium">Assigned Room: <span className="text-[#C84B31] font-bold">Room {selectedInvoice.roomNumber}</span></div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#6E6B65] font-bold block mb-1">STAY PERIOD:</span>
                    <div className="text-[#1C1B18] font-bold">{formatDate(selectedInvoice.checkInDate)} → {formatDate(selectedInvoice.checkOutDate)}</div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-[#F5F2EC] text-[#6E6B65] font-bold border-b border-[#E5E0D8]">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 w-20 text-center">Qty</th>
                        <th className="px-4 py-3 w-32 text-right">Unit Price</th>
                        <th className="px-4 py-3 w-36 text-right">Amount (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E0D8]">
                      {selectedInvoice.items && selectedInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-[#1C1B18] font-medium">{item.description}</td>
                          <td className="px-4 py-3 text-center text-[#6E6B65] font-bold">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-[#6E6B65] font-medium">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#1C1B18]">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Calculation Summary */}
                <div className="border-t border-[#E5E0D8] pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-[#6E6B65] font-medium">
                    <span>Subtotal Charges:</span>
                    <span className="text-[#1C1B18] font-bold">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-[#2D5A39] font-bold">
                      <span>Discount ({selectedInvoice.discountType === 'percentage' ? `${selectedInvoice.discountValue}%` : 'Fixed'}):</span>
                      <span>−{formatCurrency(selectedInvoice.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6E6B65] font-medium">
                    <span>VAT Tax (12%):</span>
                    <span className="text-[#1C1B18] font-bold">{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[#6E6B65] font-medium">
                    <span>Service Charge (10%):</span>
                    <span className="text-[#1C1B18] font-bold">{formatCurrency(selectedInvoice.serviceCharge)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#1C1B18] pt-2 border-t border-[#E5E0D8]">
                    <span>Grand Total:</span>
                    <span className="text-[#C84B31] text-base">{formatCurrency(selectedInvoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#2D5A39] font-bold">
                    <span>Total Amount Paid:</span>
                    <span>{formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-[#9A6208]">
                    <span>Remaining Balance Due:</span>
                    <span>{formatCurrency(selectedInvoice.balanceAmount)}</span>
                  </div>
                </div>

                {/* Payment History Ledger */}
                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                  <div className="border-t border-[#E5E0D8] pt-4 space-y-2">
                    <h4 className="text-xs font-bold text-[#1C1B18]">Payment Transactions Record:</h4>
                    <div className="space-y-1">
                      {selectedInvoice.payments.map((p) => (
                        <div key={p.id} className="flex justify-between text-[11px] p-2 bg-[#F5F2EC] rounded-lg border border-[#E5E0D8] font-medium">
                          <span className="text-[#6E6B65]">
                            {formatDateTime(p.paidAt)} • <span className="font-bold text-[#1C1B18]">{p.method}</span> {p.referenceNo ? `(${p.referenceNo})` : ''}
                          </span>
                          <span className="font-bold text-[#2D5A39]">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="zen-card p-8 text-center text-[#6E6B65] font-medium">
              Select an invoice from the left panel to preview statement details.
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${selectedInvoice?.invoiceNumber}`}
        subtitle={`Remaining Balance: ${formatCurrency(selectedInvoice?.balanceAmount)}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Payment Amount (₱) *</label>
            <input
              type="number"
              required
              min={1}
              max={selectedInvoice?.balanceAmount || 999999}
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              className="w-full px-3 py-2 zen-input text-xs font-bold text-[#1C1B18]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Payment Method *</label>
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
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Reference / OR Number</label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="e.g. GCASH-123456 or Card Auth Code"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1B18] mb-1">Notes</label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full px-3 py-2 zen-input text-xs text-[#1C1B18]"
              placeholder="Deposit upon check-in"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 zen-btn text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 zen-btn-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Save Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Extra Charges & Discount Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Adjust Charges & Discounts — ${selectedInvoice?.invoiceNumber}`}
        subtitle="Add line items (minibar, room service) or configure discounts"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveBillingEdits} className="space-y-5">
          {/* Discount Section */}
          <div className="p-3.5 bg-[#F5F2EC] rounded-xl border border-[#E5E0D8] space-y-3">
            <h4 className="text-xs font-bold text-[#1C1B18]">Discount Configuration:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#6E6B65] mb-1">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full px-3 py-1.5 zen-input text-xs text-[#1C1B18]"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₱)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#6E6B65] mb-1">Discount Value</label>
                <input
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full px-3 py-1.5 zen-input text-xs text-[#1C1B18]"
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#1C1B18]">Itemized Charges:</h4>

            <div className="flex gap-2">
              <input
                type="text"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                placeholder="New item description (e.g. Minibar, Laundry)"
                className="flex-1 px-3 py-1.5 zen-input text-xs text-[#1C1B18]"
              />
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(Number(e.target.value))}
                placeholder="Price"
                className="w-28 px-3 py-1.5 zen-input text-xs text-[#1C1B18] font-bold"
              />
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-3.5 py-1.5 zen-btn-primary text-xs font-bold"
              >
                Add Item
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {extraItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-[#F5F2EC] rounded-lg border border-[#E5E0D8] text-xs">
                  <span className="text-[#1C1B18] font-medium">{item.description}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#1C1B18]">{formatCurrency(item.amount)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(idx)}
                      className="text-rose-600 hover:text-rose-700 font-bold px-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 zen-btn text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 zen-btn-primary text-xs font-bold shadow-xs"
            >
              Recompute Bill
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
