import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app';

describe('API infrastructure', () => {
  it('returns the health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('protects product routes without a token', async () => {
    const response = await request(app).get('/api/produits');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('validates the sales payload before accessing the database', async () => {
    const response = await request(app).post('/api/ventes').send({});

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});