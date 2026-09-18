import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '1m', target: 50 }, // Stay at 50 for 1 minute
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:8000/api/v1';

export default function () {
  // Use Dev Auth
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-Role': 'officer',
    },
  };

  group('Officer API Read Operations', () => {
    // 1. Fetch Tenders
    const tendersRes = http.get(`${BASE_URL}/tenders`, params);
    check(tendersRes, {
      'tenders status is 200': (r) => r.status === 200,
    });
    
    // 2. Fetch Bid Applications (paginated)
    const appsRes = http.get(`${BASE_URL}/bid-applications?page=1&limit=20`, params);
    check(appsRes, {
      'applications status is 200': (r) => r.status === 200,
    });
    
    // 3. Fetch check types
    const checkTypesRes = http.get(`${BASE_URL}/check-types`, params);
    check(checkTypesRes, {
      'check types status is 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
