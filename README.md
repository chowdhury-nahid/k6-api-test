# k6-api-test

A starter kit for building a full-featured k6 API testing suite—just clone, follow the steps, and you’ll have everything you need to smoke-test, authenticate, load-test, report, and more. If you do this right, you'll have enough metrics and dashboards to make even your most skeptical devops friend flinch.

## What’s Inside

We’ll grow this project together, step by step. Here’s our roadmap—each step designed to gently remind you how much more you have to do:

1. Project scaffolding  ✅
   • Create a folder (e.g. `k6-api-demo`)  
   • `npm init` (optional) or just keep your .js scripts here  
   • Install k6 (locally or use the binary)  
   _(Because all great things start with an empty folder and mild existential dread.)_

2. Minimal smoke test  ✅
   • Write a single-file script that does an HTTP GET. (`/health` or `/status`)  
   • Add one `check` for HTTP 200  
   • Run: `k6 run smoke.js`  
   _(If it passes, throw yourself a tiny celebration. If it fails, start wondering about uptime.)_

3. Add thresholds & sleep  ✅
   • In `export let options` configure a simple response‐time threshold (e.g. `p(95)<500`)  
   • Insert a `sleep(1)` to mimic real pacing  
   • Verify pass/fail in the console summary  
   _(Because robots without sleep are sad, and developers without thresholds tend to panic.)_

4. Environment variables & config  ✅
   • Replace hard‐coded URL (and later creds) with `__ENV.API_BASE`  
   • Demonstrate `k6 run --env API_BASE=https://jsonplaceholder.typicode.com smoke.js`  
   • Keeps secrets out of source  
   _(You want secrets in the environment, not in your personal shame folder—or git history.)_

5. Authentication via setup()  
   • Implement a `setup()` function to POST for a token (Basic, OAuth, etc.)  
   • Return the token and consume it in your default function’s headers  
   • Validate a 200 from the auth endpoint  
   _(Feel important when you fetch your first Bearer token—because nothing says “grown-up API testing” like a little authentication flex.)_

6. Grouping & request chaining  
   • Use `group("Create → Read → Delete", …)` to show logical flow  
   • POST a new resource, grab its ID, GET it back, then DELETE it  
   • Add `check()`s on each call’s status code and JSON payload  
   _(Because testing CRUD operations is the API tester's equivalent of eating your vegetables.)_

7. Parameterize & data‐drive  
   • Create a small JSON/CSV file with test data (names, payload variants)  
   • In the script, load it once in `setup()` or at top level  
   • Cycle through records in each VU so you can demo multiple scenarios  
   _(Let the data drive your insanity and your test logic.)_

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
   _(Because ramping users is fun, until the fire alarms ring in prod.)_

9. Custom metrics & error tracking  
   • Import `Trend`, `Counter` or `Gauge` from `k6/metrics`  
   • Increment an `errors` Counter on non-200s, record durations in a Trend  
   • Add thresholds on those custom metrics  
   _(So you can track failures and response times with alarming precision—and share with everyone who didn't ask.)_

10. Output & reporting  
    • Demonstrate `--summary-export=summary.json` or `--out influxdb=…`  
    • Generate an HTML report with a tool like `k6-reporter`  
    • Sketch how you’d hook up Grafana or the k6 Cloud for long-term dashboards  
    _(Because nothing says professionalism like a pie chart and JSON artifact.)_

11. Cleanup & idempotence  
    • Ensure every created resource is deleted in the same VU or in a `teardown()`  
    • Generate unique names (e.g. timestamp or UUID) to avoid collisions under concurrency  
    _(Leave no trace—unless it's in a log file.)_

12. Error handling & retries  
    • Wrap critical calls in a retry helper (e.g. 3 attempts with backoff)  
    • Decide which failures should mark the test as failed vs. transient  
    _(Nothing screams resilience like a good retry loop…and a dash of denial.)_

13. CI/CD integration  
    • Add a pipeline step (GitHub Actions, GitLab CI, Jenkins) that runs k6  
    • Fail the build on threshold breaches or non-zero exit codes  
    • Store artifacts (JSON summaries, HTML reports) for later inspection  
    _(Automate all the things—so future you will be just as surprised as present you!)_

14. Secret management & environment isolation  
    • For more advanced demos, pull credentials from Vault or AWS Secrets Manager  
    • Show how to switch configs for dev, staging, and prod  
    _(You know you've made it when your secrets are actually… secret.)_

---

## Getting Started

### Prerequisites

- [k6](https://k6.io/docs/getting-started/installation) installed  
- (Optional) Node.js/npm if you plan to pull in extra scripts or packages  
  _(Or anything else your IT department thinks you need.)_

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

  _(Use it, share it, obsess over milliseconds—just don’t blame us if your API gets tired.)_