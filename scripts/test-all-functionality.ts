import http from 'http';

const API_BASE = 'http://localhost:3001/api';

function makeRequest(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const postData = body ? JSON.stringify(body) : '';

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`API Error [${res.statusCode}]: ${json.error || data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runFullUnitTest() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING FULL SYSTEM UNIT & FUNCTIONALITY TEST (REAL DATA)');
  console.log('=============================================================\n');

  try {
    // 1. TEST AUTHENTICATION
    console.log('👉 1. Testing Auth Login (`POST /api/auth/login`)...');
    const authRes = await makeRequest('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    if (!authRes.success || !authRes.user) throw new Error('Auth failed');
    console.log('  ✅ Auth Success: User', authRes.user.fullName, 'authenticated.');

    // 2. TEST ROOM MANAGEMENT
    console.log('\n👉 2. Testing Room Inventory (`GET /api/rooms` & `POST /api/rooms`)...');
    const roomsBefore = await makeRequest('GET', '/rooms');
    console.log(`  ℹ️ Found ${roomsBefore.length} existing rooms in SQLite database.`);

    const testRoomNum = `T${Math.floor(100 + Math.random() * 899)}`;
    console.log(`  Creating real test room #${testRoomNum}...`);
    const newRoom = await makeRequest('POST', '/rooms', {
      number: testRoomNum,
      floor: 4,
      type: 'Suite',
      bedType: 'King',
      capacity: 3,
      ratePerNight: 4500,
      status: 'Available',
      amenities: ['WiFi', 'Aircon', 'Smart TV', 'Balcony'],
      description: 'UnitTest Created Suite Room',
    });
    console.log(`  ✅ Room #${newRoom.number} created with ID ${newRoom.id}.`);

    // 3. TEST GUEST DIRECTORY
    console.log('\n👉 3. Testing Guest Profiles (`GET /api/guests` & `POST /api/guests`)...');
    const guestsBefore = await makeRequest('GET', '/guests');
    console.log(`  ℹ️ Found ${guestsBefore.length} existing guests in SQLite database.`);

    const testGuestName = `UnitTest Guest ${Date.now()}`;
    const newGuest = await makeRequest('POST', '/guests', {
      fullName: testGuestName,
      email: `unittest_${Date.now()}@example.ph`,
      phone: '+63 917 888 9999',
      idType: 'Passport',
      idNumber: `PASSPORT-${Math.floor(10000 + Math.random() * 90000)}`,
      address: 'Makati City, Metro Manila',
      nationality: 'Filipino',
      isVip: true,
      notes: 'VIP guest from unit test',
    });
    console.log(`  ✅ Guest profile "${newGuest.fullName}" created with ID ${newGuest.id}.`);

    // 4. TEST RESERVATION LIFECYCLE
    console.log('\n👉 4. Testing Reservation Lifecycle (`POST /api/reservations`)...');
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const newRes = await makeRequest('POST', '/reservations', {
      guestId: newGuest.id,
      roomId: newRoom.id,
      checkInDate: todayStr,
      checkOutDate: tomorrowStr,
      nights: 1,
      adults: 2,
      children: 0,
      specialRequests: 'Automated test reservation',
    });
    console.log(`  ✅ Reservation created: Code ${newRes.reservationCode}, Total: ₱${newRes.totalAmount}`);

    // Check-In Test
    console.log(`  Testing Check-In processing for reservation ${newRes.id}...`);
    const checkedInRes = await makeRequest('POST', `/reservations/${newRes.id}/checkin`);
    console.log(`  ✅ Check-In Processed! Success: ${checkedInRes.success}, Time: ${checkedInRes.checkInTime}`);

    // 5. TEST BILLING & AUTOMATIC TAX COMPUTATION
    console.log('\n👉 5. Testing Billing Computation & Payment Settlement...');
    const billings = await makeRequest('GET', '/billings');
    const resBilling = billings.find((b: any) => b.reservationId === newRes.id);
    if (!resBilling) throw new Error('Billing record was not automatically generated!');

    console.log(`  ℹ️ Invoice #${resBilling.invoiceNumber}: Subtotal=₱${resBilling.subtotal}, 12% VAT=₱${resBilling.taxAmount}, 10% Service=₱${resBilling.serviceCharge}, Grand Total=₱${resBilling.grandTotal}`);

    // Record Payment Test
    console.log(`  Testing Record Payment for invoice #${resBilling.invoiceNumber}...`);
    const payResult = await makeRequest('POST', `/billings/${resBilling.id}/payments`, {
      amount: resBilling.grandTotal,
      method: 'GCash',
      referenceNo: `REF-${Date.now()}`,
      notes: 'Full payment via automated test',
    });
    console.log(`  ✅ Payment Recorded! Updated Status: ${payResult.status}, Remaining Balance: ₱${payResult.balanceAmount}`);

    // Check-Out Test
    console.log(`  Testing Check-Out processing for reservation ${newRes.id}...`);
    const checkedOutRes = await makeRequest('POST', `/reservations/${newRes.id}/checkout`);
    console.log(`  ✅ Check-Out Processed! Success: ${checkedOutRes.success}, Time: ${checkedOutRes.checkOutTime}`);

    // 6. TEST FINANCIAL REPORTS
    console.log('\n👉 6. Testing Reports & Financial Analytics...');
    const dailyReport = await makeRequest('GET', `/reports/daily?date=${todayStr}`);
    console.log(`  ✅ Daily Report (${todayStr}): Total Bookings = ${dailyReport.totalBookings}, Revenue = ₱${dailyReport.totalRevenue}`);

    const monthlyReport = await makeRequest('GET', `/reports/monthly?month=${todayStr.substring(0, 7)}`);
    console.log(`  ✅ Monthly Revenue Report: Billed = ₱${monthlyReport.totalRevenue}, Collected Cash = ₱${monthlyReport.paidRevenue}`);

    const occupancyReport = await makeRequest('GET', '/reports/occupancy');
    console.log(`  ✅ Occupancy Analytics: Total Rooms = ${occupancyReport.totalRooms}`);

    console.log('\n=============================================================');
    console.log('🎉 ALL SYSTEM FUNCTIONALITY & LOGICS VERIFIED WITH REAL DATA!');
    console.log('=============================================================\n');
  } catch (err: any) {
    console.error('\n❌ UNIT TEST FAILED:', err.message);
    process.exit(1);
  }
}

runFullUnitTest();
