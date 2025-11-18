import { check, sleep } from 'k6';
import http from 'k6/http';

const config = {
  environments: {
    jsonplaceholder: {
      baseURL: "https://jsonplaceholder.typicode.com"
    },
    "restful-booker": {
      baseURL: "https://restful-booker.herokuapp.com"
    }
  },
  authProfiles: {
    none: {},
    smokeAuth: {
      username: "admin",
      password: "password123"
    }
  },
  testProfiles: {
    smoke: {
      env: "jsonplaceholder",
      auth: "none"
    },
    auth_smoke: {
      env: "restful-booker",
      auth: "smokeAuth"
    }
  },
  testType: "smoke",
  runSettings: {
    vus: 1,
    duration: "10s"
  }
};

function stripTrailingSlash(s) { 
  return String(s).replace(/\/+$/, ''); 
}

export function getTestType() {
  // Return test type with precedence: env var -> config default -> 'smoke'
  // Note: `loadConfig()` is not defined; use the local `config` object instead.
  return __ENV.TEST_TYPE || config.testType || 'smoke';
}

export function getTestProfile() {
  const testType = __ENV.TEST_TYPE || config.testType || 'smoke';
  return config.testProfiles?.[testType] || { env: 'jsonplaceholder', auth: 'none' };
}

export function getBaseURL() {
  // Priority 1: Direct API_BASE override
  if (__ENV.API_BASE) {
    return stripTrailingSlash(__ENV.API_BASE);
  }

  // Priority 2: Load from config based on test profile
  const profile = getTestProfile();
  const env = config.environments?.[profile.env];
  
  if (env?.baseURL) {
    return stripTrailingSlash(env.baseURL);
  }

  throw new Error(`No API_BASE provided and no URL found for environment "${profile.env}"`);
}

export function getCredentials() {
  const profile = getTestProfile();
  
  // Priority 1: Environment variables
  if (__ENV.USERNAME && __ENV.PASSWORD) {
    return {
      username: __ENV.USERNAME,
      password: __ENV.PASSWORD
    };
  }

  // Priority 2: Auth profile from config
  const authProfile = config.authProfiles?.[profile.auth];
  if (authProfile?.username && authProfile?.password) {
    return {
      username: authProfile.username,
      password: authProfile.password
    };
  }

  return { username: null, password: null };
}

export function requireCredentials() {
  const creds = getCredentials();
  if (!creds.username || !creds.password) {
    throw new Error('Missing credentials. Set USERNAME/PASSWORD env vars or configure auth profile');
  }
  return creds;
}

// Return the chosen stage profile name. Precedence: env var `STAGE_PROFILE` -> config.defaultStageProfile
export function getStageProfileName() {
  return __ENV.STAGE_PROFILE || config.defaultStageProfile || 'local-smoke';
}

// Return the stage profile object from config (or null)
export function getStageProfile() {
  const name = getStageProfileName();
  return config.stageProfiles?.[name] || null;
}

// Return an `options`-style object for k6 that contains either `stages` (from profile)
// or fallback runSettings (vus/duration). Environment overrides `VUS`/`DURATION` are respected.
export function getStageOptions() {
  // Env overrides for quick ad-hoc runs
  if (__ENV.VUS || __ENV.DURATION) {
    const opt = {};
    if (__ENV.VUS) opt.vus = Number(__ENV.VUS);
    if (__ENV.DURATION) opt.duration = __ENV.DURATION;
    return opt;
  }

  const profile = getStageProfile();
  if (profile && profile.stages) {
    return { stages: profile.stages };
  }

  // Last-resort fallback to config.runSettings
  const rs = config.runSettings || {};
  const fallback = {};
  if (rs.vus) fallback.vus = rs.vus;
  if (rs.duration) fallback.duration = rs.duration;
  return fallback;
}

export default function () {
  const baseURL = getBaseURL();
  const { username, password } = getCredentials();

  const res = http.get(`${baseURL}/api/some-endpoint`, {
    auth: {
      username,
      password,
    },
  });

  check(res, {
    'is status 200': (r) => r.status === 200,
  });

  sleep(1);
}