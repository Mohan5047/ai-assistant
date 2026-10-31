import { describe, it, expect } from 'vitest';
import { getRequest } from './helpers.js';

describe('Health Endpoint', () => {
  it('GET /api/health returns healthy status', async () => {
    const res = await getRequest()
      .get('/api/health')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.uptime).toBeGreaterThan(0);
  });
});
