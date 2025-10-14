import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseURL, requireCredentials } from './lib/env.js';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<1200'],
    checks: ['rate>0.99'],
  },
  stages: [
    { duration: '2s', target: 20 },
  ],
};

export function setup() {
    
  const baseURL = getBaseURL();
  const { username, password } = requireCredentials();

  const res = http.post(
    `${baseURL}/auth`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'auth status is 200': (r) => r.status === 200,
    'auth returns token': (r) => {
      try {
        return r.json('token') || r.json().token;
      } catch (e) {
        return false;
      }
    },
  });

  const token = res.json('token') || res.json().token;
  if (!token) throw new Error('Authentication failed: no token returned');
  return { token, baseURL };
}

export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
    },
  };

  const res = http.get(`${data.baseURL}/booking/1`, params);
  check(res, {
    'GET booking status is 200': (r) => r.status === 200,
  });

  sleep(randomIntBetween(1, 3));
}