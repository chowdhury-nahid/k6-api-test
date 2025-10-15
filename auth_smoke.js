import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, sleep } from 'k6';
import http from 'k6/http';
import { getBaseURL, requireCredentials } from './lib/env.js';

export const options = {
  thresholds: {
    'checks': ['rate>0.95'],
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<1000', 'p(99)<1200'],
  },
  stages: [
    { duration: '2s', target: 20 },
  ],
};

// Helper function for random future dates
function getRandomFutureDate(startDays = 1, endDays = 365) {
  const start = new Date();
  start.setDate(start.getDate() + startDays);
  const end = new Date();
  end.setDate(end.getDate() + endDays);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0];
}

export function setup() {
  const baseURL = getBaseURL();
  const { username, password } = requireCredentials();

  // Authenticate and get token
  const loginRes = http.post(
    `${baseURL}/auth`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'auth status is 200': (r) => r.status === 200,
    'auth returns token': (r) => r.json().token !== undefined,
  });

  const token = loginRes.json().token;
  if (!token) {
    throw new Error('Authentication failed - no token received');
  }

  // Get initial booking IDs
  const bookingsRes = http.get(`${baseURL}/booking`);
  const bookingIds = bookingsRes.json().map(b => b.bookingid);

  return {
    baseURL,
    token,    // Pass token through setup data
    bookingIds
  };
}

export default function (data) {
  const baseURL = data.baseURL;
  const token = data.token;  // Get token from setup data

  // 1. Create new booking
  const checkin = getRandomFutureDate(1, 30);
  const checkout = getRandomFutureDate(31, 60);
  
  const newBooking = {
    firstname: `FirstName_${randomIntBetween(1000, 9999)}`,
    lastname: `LastName_${randomIntBetween(1000, 9999)}`,
    totalprice: randomIntBetween(100, 1000),
    depositpaid: true,
    bookingdates: { checkin, checkout },
    additionalneeds: 'Breakfast'
  };

  // Create booking
  const createRes = http.post(
    `${baseURL}/booking`,
    JSON.stringify(newBooking),
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  );

  // Validate creation
  const bookingCreated = check(createRes, {
    'Create booking status is 200': (r) => r.status === 200,
    'Create booking returns ID': (r) => {
      try {
        const res = r.json();
        // console.log('Create response:', JSON.stringify(res, null, 2));
        return res && typeof res.bookingid === 'number';
      } catch (e) {
        console.error('Failed to parse create response:', e);
        return false;
      }
    }
  });

  if (!bookingCreated) {
    console.error('Failed to create booking');
    return;
  }

  const newId = createRes.json().bookingid;
  // console.log('Created booking ID:', newId);

  // 2. Verify created booking
  const getNewRes = http.get(
    `${baseURL}/booking/${newId}`,
    { 
      headers: { 
        'Accept': 'application/json'
      }
    }
  );

  check(getNewRes, {
    'Get new booking status is 200': (r) => r.status === 200,
    'New booking data matches': (r) => {
      try {
        const booking = r.json();
        return (
          booking.firstname === newBooking.firstname &&
          booking.lastname === newBooking.lastname &&
          booking.totalprice === newBooking.totalprice
        );
      } catch (e) {
        console.error('Failed to verify new booking:', e);
        return false;
      }
    }
  });

  // 3. Update the booking
  const updatedBooking = {
    firstname: `Updated_${randomIntBetween(1000, 9999)}`,
    lastname: `User_${randomIntBetween(1000, 9999)}`,
    totalprice: randomIntBetween(200, 2000),
    depositpaid: true,
    bookingdates: {
      checkin: getRandomFutureDate(5, 35),
      checkout: getRandomFutureDate(36, 65)
    },
    additionalneeds: 'Breakfast and Dinner'
  };

  // console.log(`Updating booking ${newId} with token: ${token}`);
  
  const updateRes = http.put(
    `${baseURL}/booking/${newId}`,
    JSON.stringify(updatedBooking),
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${token}`
      }
    }
  );

  check(updateRes, {
    'Update booking status is 200': (r) => {
      if (r.status !== 200) {
        console.log('Update failed:', {
          status: r.status,
          body: r.body,
          headers: r.headers
        });
      }
      return r.status === 200;
    }
  });

  // 4. Verify update if successful
  if (updateRes.status === 200) {
    const getUpdatedRes = http.get(
      `${baseURL}/booking/${newId}`,
      { 
        headers: { 
          'Accept': 'application/json'
        }
      }
    );

    check(getUpdatedRes, {
      'Updated booking matches': (r) => {
        try {
          const booking = r.json();
          return (
            booking.firstname === updatedBooking.firstname &&
            booking.lastname === updatedBooking.lastname &&
            booking.totalprice === updatedBooking.totalprice
          );
        } catch (e) {
          console.error('Failed to verify update:', e);
          return false;
        }
      }
    });
  }

// 5. Clean up - delete the booking
const deleteRes = http.del(
  `${baseURL}/booking/${newId}`,
  null, // no request body for DELETE
  {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    }
  }
);

check(deleteRes, {
  'Delete booking status is 201': (r) => r.status === 201
});


  sleep(1); // Simulate user think time
}