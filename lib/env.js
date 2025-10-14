import { check, sleep } from 'k6';
import http from 'k6/http';
import { JSON } from 'k6';

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
  return __ENV.TEST_TYPE || loadConfig().testType || 'smoke';
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

export let options = {
  vus: 10,
  duration: '30s',
};

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