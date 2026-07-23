const request = require('supertest');
const app = require('../app');

jest.mock('../config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

describe('review API', () => {
  it('rejects unauthenticated product review submissions', async () => {
    const response = await request(app).post('/api/reviews/product').send({ productId: 1, rating: 5 });
    expect(response.status).toBe(401);
  });
});
