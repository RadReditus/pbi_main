import * as request from 'supertest';
describe('Smoke', () => {
  const api = request('http://localhost:3000');
  it('health', async () => {
    await api.get('/health').expect(200);
  });
});
