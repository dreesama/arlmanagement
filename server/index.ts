import express from 'express';
import cors from 'cors';
import { getDb, initDatabase, saveDb, queryObjects, wipeAllMockData } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Database asynchronously
await initDatabase();

// -------------------------------------------------------------
// Auth Route
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await getDb();
  const users = queryObjects(db, 'SELECT id, username, fullName, role FROM users WHERE username = ? AND password = ?', [username, password]);
  if (users.length > 0) {
    res.json({ success: true, user: users[0] });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

// -------------------------------------------------------------
// Admin Reset Database API
// -------------------------------------------------------------
app.post('/api/admin/reset-database', async (req, res) => {
  const db = await getDb();
  wipeAllMockData(db);
  res.json({ success: true, message: 'All mock and sample data wiped cleanly from database.' });
});

// -------------------------------------------------------------
// Dashboard API
// -------------------------------------------------------------
app.get('/api/dashboard/stats', async (req, res) => {
  const db = await getDb();
  const rooms = queryObjects(db, 'SELECT * FROM rooms');
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r: any) => r.status === 'Occupied').length;
  const availableRooms = rooms.filter((r: any) => r.status === 'Available').length;
  const reservedRooms = rooms.filter((r: any) => r.status === 'Reserved').length;
  const maintenanceRooms = rooms.filter((r: any) => r.status === 'Maintenance').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const todayStr = new Date().toISOString().split('T')[0];

  const todayRevRow = queryObjects(db, `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paidAt LIKE ?`, [`${todayStr}%`]);
  const todayRevenue = todayRevRow.length > 0 ? todayRevRow[0].total : 0;

  const monthPrefix = todayStr.substring(0, 7);
  const monthRevRow = queryObjects(db, `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paidAt LIKE ?`, [`${monthPrefix}%`]);
  const monthlyRevenue = monthRevRow.length > 0 ? monthRevRow[0].total : 0;

  const activeResRow = queryObjects(db, `SELECT COUNT(*) as count FROM reservations WHERE status IN ('Confirmed', 'Checked-In')`);
  const arrivalsRow = queryObjects(db, `SELECT COUNT(*) as count FROM reservations WHERE checkInDate = ? AND status != 'Cancelled'`, [todayStr]);
  const departuresRow = queryObjects(db, `SELECT COUNT(*) as count FROM reservations WHERE checkOutDate = ? AND status != 'Cancelled'`, [todayStr]);

  const recentReservations = queryObjects(db, `
    SELECT r.*, g.fullName as guestName, g.email as guestEmail, g.phone as guestPhone, rm.number as roomNumber, rm.type as roomType
    FROM reservations r
    JOIN guests g ON r.guestId = g.id
    JOIN rooms rm ON r.roomId = rm.id
    ORDER BY r.id DESC
    LIMIT 5
  `);

  const monthlyRevenueData = [
    { month: 'Feb', revenue: 125000, bookings: 32 },
    { month: 'Mar', revenue: 148000, bookings: 38 },
    { month: 'Apr', revenue: 182000, bookings: 45 },
    { month: 'May', revenue: 210000, bookings: 52 },
    { month: 'Jun', revenue: 245000, bookings: 60 },
    { month: 'Jul', revenue: 289000, bookings: 68 },
  ];

  const occupancyTrendData = [
    { date: 'Jul 16', occupancyRate: 65 },
    { date: 'Jul 17', occupancyRate: 70 },
    { date: 'Jul 18', occupancyRate: 78 },
    { date: 'Jul 19', occupancyRate: 85 },
    { date: 'Jul 20', occupancyRate: 80 },
    { date: 'Jul 21', occupancyRate: 88 },
    { date: 'Jul 22', occupancyRate: occupancyRate },
  ];

  res.json({
    occupancyRate,
    availableRooms,
    totalRooms,
    occupiedRooms,
    reservedRooms,
    maintenanceRooms,
    todayRevenue,
    monthlyRevenue,
    activeReservationsCount: activeResRow[0]?.count || 0,
    todayArrivalsCount: arrivalsRow[0]?.count || 0,
    todayDeparturesCount: departuresRow[0]?.count || 0,
    recentReservations,
    monthlyRevenueData,
    occupancyTrendData
  });
});

// -------------------------------------------------------------
// Rooms API
// -------------------------------------------------------------
app.get('/api/rooms', async (req, res) => {
  const db = await getDb();
  const rooms = queryObjects(db, 'SELECT * FROM rooms ORDER BY number ASC').map((r: any) => ({
    ...r,
    amenities: JSON.parse(r.amenities || '[]')
  }));
  res.json(rooms);
});

app.post('/api/rooms', async (req, res) => {
  const { number, floor, type, bedType, capacity, ratePerNight, status, amenities, description, image } = req.body;
  const db = await getDb();
  try {
    db.run(
      `INSERT INTO rooms (number, floor, type, bedType, capacity, ratePerNight, status, amenities, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [number, floor, type, bedType, capacity, ratePerNight, status || 'Available', JSON.stringify(amenities || []), description, image || '']
    );
    saveDb();
    const created = queryObjects(db, 'SELECT * FROM rooms WHERE number = ?', [number])[0];
    if (created) created.amenities = JSON.parse(created.amenities || '[]');
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/rooms/:id', async (req, res) => {
  const { id } = req.params;
  const { number, floor, type, bedType, capacity, ratePerNight, status, amenities, description, image } = req.body;
  const db = await getDb();
  try {
    db.run(
      `UPDATE rooms SET number = ?, floor = ?, type = ?, bedType = ?, capacity = ?, ratePerNight = ?, status = ?, amenities = ?, description = ?, image = ? WHERE id = ?`,
      [number, floor, type, bedType, capacity, ratePerNight, status, JSON.stringify(amenities || []), description, image || '', id]
    );
    saveDb();
    const updated = queryObjects(db, 'SELECT * FROM rooms WHERE id = ?', [id])[0];
    if (updated) updated.amenities = JSON.parse(updated.amenities || '[]');
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/rooms/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = await getDb();
  db.run('UPDATE rooms SET status = ? WHERE id = ?', [status, id]);
  saveDb();
  res.json({ success: true, id, status });
});

app.delete('/api/rooms/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  db.run('DELETE FROM rooms WHERE id = ?', [id]);
  saveDb();
  res.json({ success: true, id });
});

// -------------------------------------------------------------
// Guests API
// -------------------------------------------------------------
app.get('/api/guests', async (req, res) => {
  const db = await getDb();
  const guests = queryObjects(db, 'SELECT * FROM guests ORDER BY id DESC').map((g: any) => ({
    ...g,
    isVip: Boolean(g.isVip)
  }));
  res.json(guests);
});

app.post('/api/guests', async (req, res) => {
  const { fullName, email, phone, idType, idNumber, address, nationality, isVip, notes } = req.body;
  const createdAt = new Date().toISOString().split('T')[0];
  const db = await getDb();
  db.run(
    `INSERT INTO guests (fullName, email, phone, idType, idNumber, address, nationality, isVip, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [fullName, email, phone, idType, idNumber, address, nationality, isVip ? 1 : 0, notes, createdAt]
  );
  saveDb();
  const newGuest = queryObjects(db, 'SELECT * FROM guests ORDER BY id DESC LIMIT 1')[0];
  if (newGuest) newGuest.isVip = Boolean(newGuest.isVip);
  res.status(201).json(newGuest);
});

app.put('/api/guests/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, idType, idNumber, address, nationality, isVip, notes } = req.body;
  const db = await getDb();
  db.run(
    `UPDATE guests SET fullName = ?, email = ?, phone = ?, idType = ?, idNumber = ?, address = ?, nationality = ?, isVip = ?, notes = ? WHERE id = ?`,
    [fullName, email, phone, idType, idNumber, address, nationality, isVip ? 1 : 0, notes, id]
  );
  saveDb();
  const updated = queryObjects(db, 'SELECT * FROM guests WHERE id = ?', [id])[0];
  if (updated) updated.isVip = Boolean(updated.isVip);
  res.json(updated);
});

app.delete('/api/guests/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  db.run('DELETE FROM guests WHERE id = ?', [id]);
  saveDb();
  res.json({ success: true, id });
});

// -------------------------------------------------------------
// Reservations API
// -------------------------------------------------------------
app.get('/api/reservations', async (req, res) => {
  const db = await getDb();
  const reservations = queryObjects(db, `
    SELECT r.*, g.fullName as guestName, g.email as guestEmail, g.phone as guestPhone, rm.number as roomNumber, rm.type as roomType
    FROM reservations r
    JOIN guests g ON r.guestId = g.id
    JOIN rooms rm ON r.roomId = rm.id
    ORDER BY r.id DESC
  `);
  res.json(reservations);
});

app.post('/api/reservations', async (req, res) => {
  const { guestId, roomId, checkInDate, checkOutDate, nights, adults, children, specialRequests } = req.body;
  const createdAt = new Date().toISOString().split('T')[0];
  const reservationCode = `ARL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const db = await getDb();
  const rooms = queryObjects(db, 'SELECT ratePerNight, number FROM rooms WHERE id = ?', [roomId]);
  const ratePerNight = rooms.length > 0 ? rooms[0].ratePerNight : 2500;
  const roomNumber = rooms.length > 0 ? rooms[0].number : '';
  const totalAmount = ratePerNight * (nights || 1);

  db.run(
    `INSERT INTO reservations (reservationCode, guestId, roomId, checkInDate, checkOutDate, nights, adults, children, status, totalAmount, specialRequests, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?, ?)`,
    [reservationCode, guestId, roomId, checkInDate, checkOutDate, nights, adults, children, totalAmount, specialRequests, createdAt]
  );
  db.run('UPDATE rooms SET status = "Reserved" WHERE id = ?', [roomId]);

  const createdRes = queryObjects(db, 'SELECT id FROM reservations WHERE reservationCode = ?', [reservationCode])[0];
  const resId = createdRes.id;

  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const subtotal = totalAmount;
  const taxAmount = subtotal * 0.12;
  const serviceCharge = subtotal * 0.10;
  const grandTotal = subtotal + taxAmount + serviceCharge;

  db.run(
    `INSERT INTO billings (invoiceNumber, reservationId, roomCharges, extraCharges, subtotal, taxAmount, serviceCharge, discountAmount, discountType, discountValue, grandTotal, paidAmount, balanceAmount, status, createdAt) VALUES (?, ?, ?, 0, ?, ?, ?, 0, 'percentage', 0, ?, 0, ?, 'Unpaid', ?)`,
    [invoiceNumber, resId, totalAmount, subtotal, taxAmount, serviceCharge, grandTotal, grandTotal, createdAt]
  );

  const billingRow = queryObjects(db, 'SELECT id FROM billings WHERE invoiceNumber = ?', [invoiceNumber])[0];
  db.run(
    `INSERT INTO billing_items (billingId, description, quantity, unitPrice, amount) VALUES (?, ?, ?, ?, ?)`,
    [billingRow.id, `Room Charge (${roomNumber} - ${nights} night/s)`, nights, ratePerNight, totalAmount]
  );

  saveDb();

  const createdFull = queryObjects(db, `
    SELECT r.*, g.fullName as guestName, g.email as guestEmail, g.phone as guestPhone, rm.number as roomNumber, rm.type as roomType
    FROM reservations r
    JOIN guests g ON r.guestId = g.id
    JOIN rooms rm ON r.roomId = rm.id
    WHERE r.id = ?
  `, [resId])[0];

  res.status(201).json(createdFull);
});

app.put('/api/reservations/:id', async (req, res) => {
  const { id } = req.params;
  const { roomId, checkInDate, checkOutDate, nights, adults, children, status, specialRequests } = req.body;

  const db = await getDb();
  const rooms = queryObjects(db, 'SELECT ratePerNight FROM rooms WHERE id = ?', [roomId]);
  const totalAmount = (rooms.length > 0 ? rooms[0].ratePerNight : 2500) * (nights || 1);

  db.run(
    `UPDATE reservations SET roomId = ?, checkInDate = ?, checkOutDate = ?, nights = ?, adults = ?, children = ?, status = ?, totalAmount = ?, specialRequests = ? WHERE id = ?`,
    [roomId, checkInDate, checkOutDate, nights, adults, children, status, totalAmount, specialRequests, id]
  );
  saveDb();

  const updated = queryObjects(db, `
    SELECT r.*, g.fullName as guestName, g.email as guestEmail, g.phone as guestPhone, rm.number as roomNumber, rm.type as roomType
    FROM reservations r
    JOIN guests g ON r.guestId = g.id
    JOIN rooms rm ON r.roomId = rm.id
    WHERE r.id = ?
  `, [id])[0];

  res.json(updated);
});

app.patch('/api/reservations/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  const resObjs = queryObjects(db, 'SELECT roomId FROM reservations WHERE id = ?', [id]);
  if (resObjs.length > 0) {
    db.run('UPDATE reservations SET status = "Cancelled" WHERE id = ?', [id]);
    db.run('UPDATE rooms SET status = "Available" WHERE id = ?', [resObjs[0].roomId]);
    saveDb();
  }
  res.json({ success: true, id });
});

app.post('/api/reservations/:id/checkin', async (req, res) => {
  const { id } = req.params;
  const checkInTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const db = await getDb();
  const resObjs = queryObjects(db, 'SELECT roomId FROM reservations WHERE id = ?', [id]);
  if (resObjs.length > 0) {
    db.run('UPDATE reservations SET status = "Checked-In", actualCheckIn = ? WHERE id = ?', [checkInTime, id]);
    db.run('UPDATE rooms SET status = "Occupied" WHERE id = ?', [resObjs[0].roomId]);
    saveDb();
  }
  res.json({ success: true, checkInTime });
});

app.post('/api/reservations/:id/checkout', async (req, res) => {
  const { id } = req.params;
  const checkOutTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const db = await getDb();
  const resObjs = queryObjects(db, 'SELECT roomId FROM reservations WHERE id = ?', [id]);
  if (resObjs.length > 0) {
    db.run('UPDATE reservations SET status = "Checked-Out", actualCheckOut = ? WHERE id = ?', [checkOutTime, id]);
    db.run('UPDATE rooms SET status = "Available" WHERE id = ?', [resObjs[0].roomId]);
    saveDb();
  }
  res.json({ success: true, checkOutTime });
});

// -------------------------------------------------------------
// Billing & Payment API
// -------------------------------------------------------------
app.get('/api/billings', async (req, res) => {
  const db = await getDb();
  const billings = queryObjects(db, `
    SELECT b.*, r.reservationCode, g.fullName as guestName, rm.number as roomNumber, r.checkInDate, r.checkOutDate
    FROM billings b
    JOIN reservations r ON b.reservationId = r.id
    JOIN guests g ON r.guestId = g.id
    JOIN rooms rm ON r.roomId = rm.id
    ORDER BY b.id DESC
  `).map((b: any) => {
    const items = queryObjects(db, 'SELECT * FROM billing_items WHERE billingId = ?', [b.id]);
    const payments = queryObjects(db, 'SELECT * FROM payments WHERE billingId = ? ORDER BY id DESC', [b.id]);
    return { ...b, items, payments };
  });
  res.json(billings);
});

app.get('/api/billings/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  const list = queryObjects(db, `
    SELECT b.*, r.reservationCode, g.fullName as guestName, g.email as guestEmail, g.phone as guestPhone, rm.number as roomNumber, rm.type as roomType, r.checkInDate, r.checkOutDate
    FROM billings b
    JOIN reservations r ON b.reservationId = r.id
    JOIN guests g ON r.guestId = g.id
    JOIN rooms rm ON r.roomId = rm.id
    WHERE b.id = ?
  `, [id]);

  if (list.length === 0) return res.status(404).json({ error: 'Billing statement not found' });
  const b = list[0];
  const items = queryObjects(db, 'SELECT * FROM billing_items WHERE billingId = ?', [b.id]);
  const payments = queryObjects(db, 'SELECT * FROM payments WHERE billingId = ? ORDER BY id DESC', [b.id]);

  res.json({ ...b, items, payments });
});

app.put('/api/billings/:id', async (req, res) => {
  const { id } = req.params;
  const { discountType, discountValue, items } = req.body;
  const db = await getDb();

  db.run('DELETE FROM billing_items WHERE billingId = ?', [id]);
  let roomCharges = 0;
  let extraCharges = 0;

  if (items && Array.isArray(items)) {
    for (const item of items) {
      const amt = item.quantity * item.unitPrice;
      db.run('INSERT INTO billing_items (billingId, description, quantity, unitPrice, amount) VALUES (?, ?, ?, ?, ?)', [id, item.description, item.quantity, item.unitPrice, amt]);
      if (item.description.toLowerCase().includes('room charge')) {
        roomCharges += amt;
      } else {
        extraCharges += amt;
      }
    }
  }

  const subtotal = roomCharges + extraCharges;
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (subtotal * discountValue) / 100;
  } else {
    discountAmount = discountValue || 0;
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = discountedSubtotal * 0.12;
  const serviceCharge = discountedSubtotal * 0.10;
  const grandTotal = discountedSubtotal + taxAmount + serviceCharge;

  const paidRows = queryObjects(db, 'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE billingId = ?', [id]);
  const paidAmount = paidRows.length > 0 ? paidRows[0].total : 0;
  const balanceAmount = Math.max(0, grandTotal - paidAmount);

  let status = 'Unpaid';
  if (balanceAmount === 0 && grandTotal > 0) status = 'Paid';
  else if (paidAmount > 0) status = 'Partial';

  db.run(
    `UPDATE billings SET roomCharges = ?, extraCharges = ?, subtotal = ?, taxAmount = ?, serviceCharge = ?, discountAmount = ?, discountType = ?, discountValue = ?, grandTotal = ?, paidAmount = ?, balanceAmount = ?, status = ? WHERE id = ?`,
    [roomCharges, extraCharges, subtotal, taxAmount, serviceCharge, discountAmount, discountType, discountValue, grandTotal, paidAmount, balanceAmount, status, id]
  );
  saveDb();

  const updated = queryObjects(db, 'SELECT * FROM billings WHERE id = ?', [id])[0];
  const updatedItems = queryObjects(db, 'SELECT * FROM billing_items WHERE billingId = ?', [id]);
  const payments = queryObjects(db, 'SELECT * FROM payments WHERE billingId = ?', [id]);

  res.json({ ...updated, items: updatedItems, payments });
});

app.post('/api/billings/:id/payments', async (req, res) => {
  const { id } = req.params;
  const { amount, method, referenceNo, notes } = req.body;
  const paidAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const db = await getDb();

  db.run(
    'INSERT INTO payments (billingId, amount, method, referenceNo, paidAt, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [id, amount, method, referenceNo || '', paidAt, notes || '']
  );

  const paidRows = queryObjects(db, 'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE billingId = ?', [id]);
  const paidAmount = paidRows.length > 0 ? paidRows[0].total : 0;

  const billings = queryObjects(db, 'SELECT grandTotal FROM billings WHERE id = ?', [id]);
  const grandTotal = billings.length > 0 ? billings[0].grandTotal : 0;
  const balanceAmount = Math.max(0, grandTotal - paidAmount);

  let status = 'Unpaid';
  if (balanceAmount === 0 && grandTotal > 0) status = 'Paid';
  else if (paidAmount > 0) status = 'Partial';

  db.run('UPDATE billings SET paidAmount = ?, balanceAmount = ?, status = ? WHERE id = ?', [paidAmount, balanceAmount, status, id]);
  saveDb();

  res.status(201).json({ success: true, paidAmount, balanceAmount, status });
});

// -------------------------------------------------------------
// Reports API
// -------------------------------------------------------------
app.get('/api/reports/daily', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const db = await getDb();
  const bookings = queryObjects(db, `
    SELECT r.*, g.fullName as guestName, rm.number as roomNumber, rm.type as roomType
    FROM reservations r
    JOIN guests g ON r.guestId = g.id
    JOIN rooms rm ON r.roomId = rm.id
    WHERE r.createdAt LIKE ?
    ORDER BY r.id DESC
  `, [`${date}%`]);

  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0);

  res.json({ date, totalBookings, totalRevenue, bookings });
});

app.get('/api/reports/monthly', async (req, res) => {
  const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
  const db = await getDb();
  const billings = queryObjects(db, `
    SELECT b.*, r.reservationCode, g.fullName as guestName, rm.type as roomType
    FROM billings b
    JOIN reservations r ON b.reservationId = r.id
    JOIN guests g ON r.guestId = g.id
    JOIN rooms rm ON r.roomId = rm.id
    WHERE b.createdAt LIKE ?
  `, [`${month}%`]);

  const totalRevenue = billings.reduce((sum: number, b: any) => sum + b.grandTotal, 0);
  const paidRevenue = billings.reduce((sum: number, b: any) => sum + b.paidAmount, 0);
  const pendingRevenue = billings.reduce((sum: number, b: any) => sum + b.balanceAmount, 0);

  const roomTypeRevenue: Record<string, number> = {};
  billings.forEach((b: any) => {
    roomTypeRevenue[b.roomType] = (roomTypeRevenue[b.roomType] || 0) + b.grandTotal;
  });

  res.json({ month, totalRevenue, paidRevenue, pendingRevenue, roomTypeRevenue, billings });
});

app.get('/api/reports/occupancy', async (req, res) => {
  const db = await getDb();
  const rooms = queryObjects(db, 'SELECT * FROM rooms');
  const totalRooms = rooms.length;
  const byType: Record<string, { total: number; occupied: number; reserved: number; available: number }> = {};

  rooms.forEach(r => {
    if (!byType[r.type]) {
      byType[r.type] = { total: 0, occupied: 0, reserved: 0, available: 0 };
    }
    byType[r.type].total++;
    if (r.status === 'Occupied') byType[r.type].occupied++;
    else if (r.status === 'Reserved') byType[r.type].reserved++;
    else if (r.status === 'Available') byType[r.type].available++;
  });

  res.json({ totalRooms, byType, rooms });
});

app.listen(PORT, () => {
  console.log(`ARL's Hotel API Server listening on http://localhost:${PORT}`);
});
