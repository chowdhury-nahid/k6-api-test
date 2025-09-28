import http from "k6/http";
import { check } from "k6";

export default function () {
  // 1) Issue a GET to your health/status endpoint
  const res = http.get("https://jsonplaceholder.typicode.com/posts");

  // 2) A single check: did we get HTTP 200 back?
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response body is not empty": (r) => r.body.length > 0,
  });
}