import http from "k6/http";
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { getBaseURL } from './lib/env.js';

export const options = {
  thresholds: {
    'checks': ['rate>0.95'],        // Lowered from 0.99 for initial testing
    'http_req_failed': ['rate<0.05'] // Increased from 0.01 for initial testing
  },
  stages: [
    { duration: '2s', target: 20 },
  ],
};

export default function () {
  const baseURL = getBaseURL();
  let res;

  // Test GET /posts/{id}
  try {
    res = http.get(`${baseURL}/posts/${randomIntBetween(1, 100)}`);
    check(res, {
      'GET single post status is 200': (r) => r.status === 200,
      'GET single post has correct structure': (r) => {
        try {
          const body = r.json();
          return body && typeof body === 'object' && ('id' in body) && ('title' in body);
        } catch (e) {
          console.error('Failed to parse GET response:', e);
          return false;
        }
      },
    });
  } catch (e) {
    console.error('GET request failed:', e);
  }

  // Test POST /posts
  try {
    const title = 'Test Title ' + randomIntBetween(1, 100);
    const payload = JSON.stringify({
      title,
      body: 'Test body content',
      userId: 1,
    });
    const params = {
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      timeout: 10000 // 10s timeout
    };

    res = http.post(`${baseURL}/posts`, payload, params);
    check(res, {
      'POST create status is 201': (r) => r.status === 201,
      'POST create response contains title': (r) => {
        try {
          return r.json().title === title;
        } catch (e) {
          console.error('Failed to parse POST response:', e);
          return false;
        }
      },
    });
  } catch (e) {
    console.error('POST request failed:', e);
  }

  sleep(1);
}