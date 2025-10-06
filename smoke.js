import http from "k6/http";
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
// import { open } from "k6/fs";

const config = JSON.parse(open("./config.json"));
const ENV = __ENV.ENV || "local";
const envConfig = config.environments && config.environments[ENV];
if (!envConfig || !envConfig.baseURL) {
  throw new Error(`Missing environment config for "${ENV}". Check config.json`);
}
const baseURL = envConfig.baseURL; // source: https://jsonplaceholder.typicode.com/guide/

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    http_req_duration: ['p(95)<1000', 'p(99)<1200'], // 95% < 1000ms, 99% < 1200ms
    checks: ['rate>0.99'], // Checks must pass >99% of the time
  },
  
  stages: [
    { duration: '2s', target: 20 },
    // { duration: '2m', target: 50 },
    // { duration: '3m', target: 50 },
    // { duration: '1m', target: 0 },
  ],
};


export default function () {

  let res; 

  // GET a single post
  res = http.get(`${baseURL}/posts/${randomIntBetween(1, 100)}`);
  check(res, {
    'GET single post status is 200': (r) => r.status === 200,
    'GET single post has correct structure': (r) => {
      try {
        const body = r.json();
        return body && typeof body === 'object' && ('id' in body) && ('title' in body);
      } catch (e) {
        return false;
      }
    },
  });

  // POST a new post
  const title = 'Test Title ' + randomIntBetween(1, 100);
  const payload = JSON.stringify({
    title,
    body: 'Test body content',
    userId: 1,
  });
  const params = {
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  };

  res = http.post(`${baseURL}/posts`, payload, params);
  check(res, {
    'POST create status is 201': (r) => r.status === 201,
    'POST create response contains title': (r) => {
      try {
        return r.json().title === title;
      } catch (e) {
        return false;
      }
    },
  });


  sleep(randomIntBetween(1, 3)); // Random think time between 1-3 seconds
}