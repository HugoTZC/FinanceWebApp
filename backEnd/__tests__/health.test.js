const request = require('supertest');

process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const app = require('../app');

describe('GET /api/health', () => {
  it('returns the legacy API health response without touching user data', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toEqual({
      status: 'success',
      message: 'API is running'
    });
  });
});
