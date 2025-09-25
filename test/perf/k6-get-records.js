import http from 'k6/http';
import { check, sleep } from 'k6';
export let options = { vus: 5, duration: '10s' };
export default function () {
  const res = http.get('http://localhost:3000/api/v1/records/tagged?take=10', { headers: { 'x-api-key': __ENV.API_KEY || '0123456789abcdef0123456789abcdef' }});
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
