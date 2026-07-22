import initSqlJs, { Database as SqlDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'arl_hotel.db');
let db: SqlDatabase;

export async function getDb(): Promise<SqlDatabase> {
  if (!db) {
    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  }
  return db;
}

export function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function initDatabase() {
  const database = await getDb();

  // Create Rooms Table with image column
  database.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE NOT NULL,
      floor INTEGER NOT NULL,
      type TEXT NOT NULL,
      bedType TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      ratePerNight REAL NOT NULL,
      status TEXT NOT NULL,
      amenities TEXT NOT NULL,
      description TEXT,
      image TEXT
    );
  `);

  try {
    database.run('ALTER TABLE rooms ADD COLUMN image TEXT;');
  } catch (e) {
    // Column already exists
  }

  // Create Guests Table
  database.run(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      idType TEXT NOT NULL,
      idNumber TEXT NOT NULL,
      address TEXT NOT NULL,
      nationality TEXT NOT NULL,
      isVip INTEGER DEFAULT 0,
      notes TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // Create Reservations Table
  database.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservationCode TEXT UNIQUE NOT NULL,
      guestId INTEGER NOT NULL,
      roomId INTEGER NOT NULL,
      checkInDate TEXT NOT NULL,
      checkOutDate TEXT NOT NULL,
      nights INTEGER NOT NULL,
      adults INTEGER NOT NULL,
      children INTEGER NOT NULL,
      status TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      specialRequests TEXT,
      actualCheckIn TEXT,
      actualCheckOut TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  // Create Billings Table
  database.run(`
    CREATE TABLE IF NOT EXISTS billings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceNumber TEXT UNIQUE NOT NULL,
      reservationId INTEGER NOT NULL,
      roomCharges REAL NOT NULL,
      extraCharges REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      taxAmount REAL NOT NULL,
      serviceCharge REAL NOT NULL,
      discountAmount REAL DEFAULT 0,
      discountType TEXT DEFAULT 'percentage',
      discountValue REAL DEFAULT 0,
      grandTotal REAL NOT NULL,
      paidAmount REAL DEFAULT 0,
      balanceAmount REAL NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // Create Billing Items Table
  database.run(`
    CREATE TABLE IF NOT EXISTS billing_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billingId INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      amount REAL NOT NULL
    );
  `);

  // Create Payments Table
  database.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billingId INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      referenceNo TEXT,
      paidAt TEXT NOT NULL,
      notes TEXT
    );
  `);

  // Create Users Table
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      fullName TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

  seedDefaultAdminUser(database);
  seedHighQualityRoomMockData(database);
  saveDb();
}

export function seedDefaultAdminUser(database: SqlDatabase) {
  const users = queryObjects(database, 'SELECT * FROM users WHERE username = "admin"');
  if (users.length === 0) {
    database.run(`
      INSERT INTO users (username, password, fullName, role)
      VALUES ('admin', 'admin123', 'Administrator', 'Admin')
    `);
  }
}

export function seedHighQualityRoomMockData(database: SqlDatabase) {
  const res = database.exec('SELECT COUNT(*) as count FROM rooms');
  if (res.length > 0 && Number(res[0].values[0][0]) > 0) {
    // Update existing room images to hotel room interior photos
    const updates = [
      { number: '101', image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80' },
      { number: '102', image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80' },
      { number: '103', image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80' },
      { number: '201', image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80' },
      { number: '202', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80' },
      { number: '203', image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80' },
      { number: '301', image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80' },
      { number: '302', image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80' },
      { number: '401', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80' },
    ];
    for (const u of updates) {
      database.run('UPDATE rooms SET image = ? WHERE number = ?', [u.image, u.number]);
    }
    return;
  }

  console.log('Seeding authentic hotel room interior mock data...');

  const roomsData = [
    {
      number: '101',
      floor: 1,
      type: 'Standard',
      bedType: 'Queen',
      capacity: 2,
      ratePerNight: 2500,
      status: 'Available',
      amenities: JSON.stringify(['WiFi', 'AC', 'Smart TV', 'Mini Fridge']),
      description: 'Cozy Japandi minimalist hotel suite with natural wood furnishings, plush linens, and serene ambient lighting.',
      image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    },
    {
      number: '102',
      floor: 1,
      type: 'Standard',
      bedType: 'Queen',
      capacity: 2,
      ratePerNight: 2500,
      status: 'Available',
      amenities: JSON.stringify(['WiFi', 'AC', 'Smart TV', 'Mini Fridge']),
      description: 'Ground floor hotel room featuring tatami mat accent headboard, organic cotton sheets, and rainfall shower.',
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    },
    {
      number: '103',
      floor: 1,
      type: 'Standard',
      bedType: 'Twin',
      capacity: 2,
      ratePerNight: 2400,
      status: 'Available',
      amenities: JSON.stringify(['WiFi', 'AC', 'Smart TV']),
      description: 'Twin single bed hotel room with warm bamboo wood trim and custom executive workstation.',
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    },
    {
      number: '201',
      floor: 2,
      type: 'Deluxe',
      bedType: 'King',
      capacity: 3,
      ratePerNight: 4500,
      status: 'Available',
      amenities: JSON.stringify(['WiFi', 'AC', 'Smart TV', 'Balcony', 'Bathtub', 'Nespresso Machine']),
      description: 'Spacious Deluxe Hotel Suite with private balcony overlooking coastal sunset view and marble soaking tub.',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    },
    {
      number: '202',
      floor: 2,
      type: 'Deluxe',
      bedType: 'King',
      capacity: 3,
      ratePerNight: 4500,
      status: 'Reserved',
      amenities: JSON.stringify(['WiFi', 'AC', 'Smart TV', 'Balcony', 'Bathtub']),
      description: 'Deluxe King Hotel Suite with shoji screen spatial dividers, mood lighting, and high-thread cotton duvet.',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    },
    {
      number: '203',
      floor: 2,
      type: 'Deluxe',
      bedType: 'Queen Twin',
      capacity: 4,
      ratePerNight: 4800,
      status: 'Available',
      amenities: JSON.stringify(['WiFi', 'AC', 'Smart TV', 'Bathtub', 'Mini Bar']),
      description: 'Family Deluxe Hotel Suite equipped with double queen beds and serene minimalist aesthetic.',
      image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    },
    {
      number: '301',
      floor: 3,
      type: 'Suite',
      bedType: 'King Executive',
      capacity: 4,
      ratePerNight: 8500,
      status: 'Available',
      amenities: JSON.stringify(['WiFi', 'AC', '65" Smart TV', 'Living Room', 'Jacuzzi', 'Ocean View', 'Mini Bar']),
      description: 'Executive Hotel Suite featuring a private living lounge, stone jacuzzi tub, and sweeping ocean view.',
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    },
    {
      number: '302',
      floor: 3,
      type: 'Suite',
      bedType: 'King Executive',
      capacity: 4,
      ratePerNight: 8500,
      status: 'Maintenance',
      amenities: JSON.stringify(['WiFi', 'AC', '65" Smart TV', 'Living Room', 'Jacuzzi', 'Ocean View']),
      description: 'Executive hotel suite interior with private balcony and spa bathroom.',
      image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
    },
    {
      number: '401',
      floor: 4,
      type: 'Presidential',
      bedType: 'Super King',
      capacity: 6,
      ratePerNight: 18000,
      status: 'Reserved',
      amenities: JSON.stringify(['Private Elevator', 'Butler Service', 'Private Pool', 'Kitchenette', 'Home Theater', 'Panoramic View', 'Sauna']),
      description: 'Ultra-luxurious Presidential Suite master bedroom featuring panoramic floor-to-ceiling glass windows and 24/7 dedicated butler service.',
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  for (const r of roomsData) {
    database.run(
      `INSERT INTO rooms (number, floor, type, bedType, capacity, ratePerNight, status, amenities, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.number, r.floor, r.type, r.bedType, r.capacity, r.ratePerNight, r.status, r.amenities, r.description, r.image]
    );
  }
}

export function wipeAllMockData(database: SqlDatabase) {
  database.run('DELETE FROM rooms');
  database.run('DELETE FROM guests');
  database.run('DELETE FROM reservations');
  database.run('DELETE FROM billings');
  database.run('DELETE FROM billing_items');
  database.run('DELETE FROM payments');
  saveDb();
}

// SQL Query helper for sql.js returning object array
export function queryObjects(database: SqlDatabase, sql: string, params: any[] = []): any[] {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}
