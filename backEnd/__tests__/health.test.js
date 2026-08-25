const request = require('supertest');
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
