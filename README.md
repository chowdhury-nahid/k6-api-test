# k6-api-test

A starter kit for building a full-featured k6 API testing suite—just clone, follow the steps, and you’ll have everything you need to smoke-test, authenticate, load-test, report, and more.

## What’s Inside

We’ll grow this project together, step by step. Here’s our roadmap:


1. Project scaffolding  
   • Create a folder (e.g. `k6-api-demo`)  
   • `npm init` (optional) or just keep your .js scripts here  
   • Install k6 (locally or use the binary)

2. Minimal smoke test  
   • Write a single-file script that does an HTTP GET. (`/health` or `/status`)
   • Add one `check` for HTTP 200  
   • Run: `k6 run smoke.js`

3. Add thresholds & sleep  
   • In `export let options` configure a simple response‐time threshold (e.g. `p(95)<500`)  
   • Insert a `sleep(1)` to mimic real pacing  
   • Verify pass/fail in the console summary

4. Environment variables & config  
   • Replace hard‐coded URL (and later creds) with `__ENV.API_BASE`  
   • Demonstrate `k6 run --env API_BASE=https://api.myapp.test smoke.js`  
   • Keeps secrets out of source

5. Authentication via setup()  
   • Implement a `setup()` function to POST for a token (Basic, OAuth, etc.)  
   • Return the token and consume it in your default function’s headers  
   • Validate a 200 from the auth endpoint

6. Grouping & request chaining  
   • Use `group("Create → Read → Delete", …)` to show logical flow  
   • POST a new resource, grab its ID, GET it back, then DELETE it  
   • Add `check()`s on each call’s status code and JSON payload

7. Parameterize & data‐drive  
   • Create a small JSON/CSV file with test data (names, payload variants)  
   • In the script, load it once in `setup()` or at top level  
   • Cycle through records in each VU so you can demo multiple scenarios

8. Load profile & stages  
   • In `options`, define  
     ```js
     stages: [
       { duration: "30s", target: 20 },
       …
     ]
     ```  
   • Show gradual ramp-up and ramp-down in k6 summary output  
   • Point out the difference between functional vs. performance runs

9. Custom metrics & error tracking  
   • Import `Trend`, `Counter` or `Gauge` from `k6/metrics`  
   • Increment an `errors` Counter on non-200s, record durations in a Trend  
   • Add thresholds on those custom metrics

10. Output & reporting  
    • Demonstrate `--summary-export=summary.json` or `--out influxdb=…`  
    • Generate an HTML report with a tool like `k6-reporter`  
    • Sketch how you’d hook up Grafana or the k6 Cloud for long-term dashboards

11. Cleanup & idempotence  
    • Ensure every created resource is deleted in the same VU or in a `teardown()`  
    • Generate unique names (e.g. timestamp or UUID) to avoid collisions under concurrency

12. Error handling & retries  
    • Wrap critical calls in a retry helper (e.g. 3 attempts with backoff)  
    • Decide which failures should mark the test as failed vs. transient

13. CI/CD integration  
    • Add a pipeline step (GitHub Actions, GitLab CI, Jenkins) that runs k6  
    • Fail the build on threshold breaches or non-zero exit codes  
    • Store artifacts (JSON summaries, HTML reports) for later inspection

14. Secret management & environment isolation  
    • For more advanced demos, pull credentials from Vault or AWS Secrets Manager  
    • Show how to switch configs for dev, staging, and prod

---

## Getting Started

### Prerequisites

- [k6](https://k6.io/docs/getting-started/installation) installed  
- (Optional) Node.js/npm if you plan to pull in extra scripts or packages  

### Quick Setup

```bash
git clone https://github.com/chowdhury-nahid/k6-api-test.git
cd k6-api-test
# ensure you’re on main
git checkout main

# 1) Run the smoke test
k6 run smoke.js

As you tick off each item in the roadmap, you’ll add or refine scripts here until you’ve got a production-grade API test suite.

## Contributing & Questions

If you have ideas, find issues, or want to tweak the flow, please open an issue or send a pull request. For quick questions, reach out at your.email@domain.com.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.