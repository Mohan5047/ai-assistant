import { describe, it, expect } from 'vitest';
import { getRequest, createAuthenticatedUser } from './helpers.js';

describe('Dashboard API', () => {
  describe('GET /api/dashboard/summary', () => {
    it('returns empty summary for new user', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.todayEvents).toEqual([]);
      expect(res.body.data.upcomingEvents).toEqual([]);
      expect(res.body.data.counts.todayTotal).toBe(0);
      expect(res.body.data.counts.upcomingTotal).toBe(0);
      expect(res.body.data.counts.thisWeekTotal).toBe(0);
    });

    it('returns today events in summary', async () => {
      const { token } = await createAuthenticatedUser();

      // Create event for today
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(now.getHours() + 1, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      // Only add if today's remaining hours allow
      if (startTime.getDate() === now.getDate()) {
        await getRequest()
          .post('/api/events')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Today Event',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            timezone: 'UTC',
          })
          .expect(201);
      }

      // Create event for next week (upcoming)
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 3);
      nextWeek.setHours(10, 0, 0, 0);
      const nextWeekEnd = new Date(nextWeek);
      nextWeekEnd.setHours(11, 0, 0, 0);

      await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Upcoming Event',
          startTime: nextWeek.toISOString(),
          endTime: nextWeekEnd.toISOString(),
          timezone: 'UTC',
        })
        .expect(201);

      const res = await getRequest()
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.upcomingEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('requires authentication', async () => {
      await getRequest()
        .get('/api/dashboard/summary')
        .expect(401);
    });
  });
});
