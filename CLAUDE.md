# CLAUDE.md — k6-api-test

## What this is
Starter kit for building a k6 API testing suite. Covers smoke testing, authentication, load testing, and environment-based configuration. Step-by-step learning project.

## Tech stack
- k6 (JavaScript)
- npm (optional, for project management)

## Project structure
- `smoke.js` — basic smoke test (HTTP GET with checks and thresholds)
- `auth_smoke.js` — authenticated smoke test
- `config.json` — environment configuration
- `data/` — test data files
- `lib/` — reusable helper functions

## Commands
```bash
k6 run smoke.js                                           # basic smoke test
k6 run --env API_BASE=https://example.com smoke.js        # with custom base URL
k6 run auth_smoke.js                                      # authenticated tests
```

## Notes
- Uses environment variables for secrets (`__ENV.API_BASE`)
- Includes thresholds (e.g., `p(95)<500` response time)
