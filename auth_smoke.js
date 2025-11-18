import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, sleep } from 'k6';
import http from 'k6/http';
import { getBaseURL, requireCredentials, getStageOptions } from './lib/env.js';
import { Trend, Counter } from 'k6/metrics';

const baseOptions = {
  thresholds: {
    'checks': ['rate>0.95'],
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<1000', 'p(99)<1200'],
    // Custom metric thresholds
    'request_duration_ms': ['p(95)<1000'],
    'errors': ['count<1']
  },
};

// Merge central stage/profile options (stages or vus/duration) with script-specific options
export const options = Object.assign({}, baseOptions, getStageOptions());

// Load test data at init time. `open()` is only available at module init/global scope.
let TEST_DATA = null;
try {
  TEST_DATA = JSON.parse(open('./data/test_data.json'));
} catch (e) {
  console.error('Failed to load test data at init:', e);
}

// Helper function for random future dates
function getRandomFutureDate(startDays = 1, endDays = 365) {
  const start = new Date();
  start.setDate(start.getDate() + startDays);
  const end = new Date();
  end.setDate(end.getDate() + endDays);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0];
}

// Safe JSON parser helper: avoids throwing when response is not JSON
function safeJson(res) {
  try {
    return res && res.body ? res.json() : null;
  } catch (e) {
    console.error('Failed to parse JSON (truncated):', res && res.body ? res.body.slice(0,512) : '<no body>');
    return null;
  }
}

export function setup() {
  const baseURL = getBaseURL();
  const { username, password } = requireCredentials();

  // Preflight: verify baseURL is a JSON API we expect (helps catch example.com or HTML error pages)
  try {
    const preflightRes = http.get(`${baseURL}/booking`, { headers: { 'Accept': 'application/json' }, timeout: 10000 });
    recordMetrics(preflightRes);
    const preflightCT = (preflightRes.headers['Content-Type'] || preflightRes.headers['content-type'] || '').toLowerCase();
    if (preflightRes.status !== 200 || !preflightCT.includes('json')) {
      console.error('Preflight check failed: expected JSON 200 from /booking. status=', preflightRes.status, 'content-type=', preflightCT, 'body=', preflightRes.body ? preflightRes.body.slice(0,512) : '<no body>');
      throw new Error(`Preflight failed: ${baseURL} did not return expected JSON for /booking. Make sure --env API_BASE points to a Restful-Booker compatible URL (e.g. https://restful-booker.herokuapp.com)`);
    }
  } catch (e) {
    throw new Error(`Failed preflight check for ${baseURL}/booking: ${e.message || e}`);
  }

  // Authenticate and get token
  const loginRes = http.post(
    `${baseURL}/auth`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  recordMetrics(loginRes);

  // Be defensive: some endpoints (or misconfigured API_BASE) return HTML/XML
  // instead of JSON which will cause `r.json()` to throw. Parse safely.
  let authJson = null;
  try {
    if (loginRes && loginRes.body) {
      // Only attempt to parse if response Content-Type looks like JSON
      const contentType = (loginRes.headers['Content-Type'] || loginRes.headers['content-type'] || '').toLowerCase();
      if (contentType.includes('application/json') || contentType.includes('json')) {
        authJson = loginRes.json();
      } else {
        // Attempt parse anyway inside try/catch for leniency
        try {
          authJson = loginRes.json();
        } catch (e) {
          console.error('Auth endpoint returned non-JSON content. Response body (truncated):', loginRes.body.slice(0, 512));
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse auth response as JSON:', e, 'Response body (truncated):', loginRes && loginRes.body ? loginRes.body.slice(0, 512) : '<no body>');
  }

  check(loginRes, {
    'auth status is 200': (r) => r.status === 200,
    'auth returns token': (r) => !!(authJson && authJson.token),
  });

  const token = authJson && authJson.token;
  if (!token) {
    // Provide actionable error so the user can see what went wrong instead of a cryptic parse error
    throw new Error(`Authentication failed - no token received. status=${loginRes.status} body=${(loginRes && loginRes.body) ? loginRes.body.slice(0,512) : '<no body>'}`);
  }

  // Get initial booking IDs
    const bookingsRes = http.get(`${baseURL}/booking`);
    recordMetrics(bookingsRes);
  // Guard: ensure we got an array back before mapping booking IDs
  let bookingIds = [];
  try {
    const bookingsBody = safeJson(bookingsRes);
    if (Array.isArray(bookingsBody)) {
      bookingIds = bookingsBody.map(b => b.bookingid);
    } else {
      console.error('/booking did not return an array; response type:', typeof bookingsBody, 'value (truncated):', bookingsRes && bookingsRes.body ? bookingsRes.body.slice(0,512) : '<no body>');
    }
  } catch (e) {
    console.error('Failed to extract booking IDs:', e);
  }

  return {
    baseURL,
    token,    // Pass token through setup data
    bookingIds,
    testData: Array.isArray(TEST_DATA) && TEST_DATA.length ? TEST_DATA : null
  };
}

export default function (data) {
  const baseURL = data.baseURL;
  const token = data.token;  // Get token from setup data
  const testData = Array.isArray(data.testData) && data.testData.length ? data.testData : null;

  // 1. Create new booking
  const checkin = getRandomFutureDate(1, 30);
  const checkout = getRandomFutureDate(31, 60);
  
  // Choose a data-driven record if available; otherwise fall back to random values
  let firstname = `FirstName_${randomIntBetween(1000, 9999)}`;
  let lastname = `LastName_${randomIntBetween(1000, 9999)}`;
  let additionalneeds = 'Breakfast';
  let totalprice = randomIntBetween(100, 1000);

  if (testData) {
    // __VU and __ITER are globals provided by k6 at runtime
    const vu = typeof __VU !== 'undefined' ? __VU : 1;
    const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
    const idx = ((vu - 1) + iter) % testData.length;
    const record = testData[idx];

    firstname = record.firstname || firstname;
    lastname = record.lastname || lastname;
    additionalneeds = record.additionalneeds || additionalneeds;
    if (record.minPrice || record.maxPrice) {
      const minP = record.minPrice || 50;
      const maxP = record.maxPrice || (minP + 500);
      totalprice = randomIntBetween(minP, maxP);
    }
  }

  const newBooking = {
    firstname,
    lastname,
    totalprice,
    depositpaid: true,
    bookingdates: { checkin, checkout },
    additionalneeds
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
  recordMetrics(createRes);

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
  recordMetrics(getNewRes);

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
  recordMetrics(updateRes);

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

    recordMetrics(getUpdatedRes);

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

recordMetrics(deleteRes);

check(deleteRes, {
  'Delete booking status is 201': (r) => r.status === 201
});


  sleep(1); // Simulate user think time
}

// Custom metrics
const requestDuration = new Trend('request_duration_ms');
const errors = new Counter('errors');

function recordMetrics(res) {
  if (!res) {
    errors.add(1);
    return;
  }
  const dur = res.timings && typeof res.timings.duration === 'number' ? res.timings.duration : null;
  if (dur !== null) requestDuration.add(dur);
  if (res.status >= 400) errors.add(1);
}