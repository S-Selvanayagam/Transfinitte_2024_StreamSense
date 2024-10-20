import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = 'http://localhost:3001';

export default function () {
  console.log('Starting test iteration');

  const responses = http.batch([
    ['GET', `${BASE_URL}/health`, null, { tags: { name: 'HealthCheck' } }],
    ['GET', `${BASE_URL}/stats`, null, { tags: { name: 'Stats' } }],
    ['GET', `${BASE_URL}/random/dummyuser`, null, { tags: { name: 'RandomDummyUser' } }],
    ['GET', `${BASE_URL}/random/geolocation`, null, { tags: { name: 'RandomGeolocation' } }],
    ['GET', `${BASE_URL}/random/sales`, null, { tags: { name: 'RandomSales' } }],
  ]);

  responses.forEach((response, index) => {
    if (response.error) {
      console.error(`Error in request ${index}: ${response.error}`);
    } else {
      console.log(`Request ${index} status: ${response.status}`);
    }
  });

  check(responses[0], {
    'health check status is 200': (r) => r.status === 200,
  });

  check(responses[1], {
    'stats status is 200': (r) => r.status === 200,
    'stats has correct collections': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.dummyuser !== undefined && body.geolocation !== undefined && body.sales !== undefined;
      } catch (e) {
        console.error('Error parsing stats response:', e);
        return false;
      }
    },
  });

  for (let i = 2; i < responses.length; i++) {
    check(responses[i], {
      [`random ${['dummyuser', 'geolocation', 'sales'][i-2]} status is 200`]: (r) => r.status === 200,
      [`random ${['dummyuser', 'geolocation', 'sales'][i-2]} returns a document`]: (r) => {
        try {
          return JSON.parse(r.body) !== null;
        } catch (e) {
          console.error(`Error parsing response for ${['dummyuser', 'geolocation', 'sales'][i-2]}:`, e);
          return false;
        }
      },
    });
  }

  console.log('Finished test iteration');
  sleep(1);
}