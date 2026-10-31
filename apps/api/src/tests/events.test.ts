import { describe, it, expect } from 'vitest';
import { getRequest, createAuthenticatedUser } from './helpers.js';

describe('Events API', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  const validEvent = {
    title: 'Team Meeting',
    description: 'Weekly sync',
    location: 'Conference Room',
    startTime: tomorrow.toISOString(),
    endTime: tomorrowEnd.toISOString(),
    timezone: 'America/New_York',
    isAllDay: false,
  };

  describe('POST /api/events', () => {
    it('creates an event successfully', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(validEvent)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Team Meeting');
      expect(res.body.data.description).toBe('Weekly sync');
      expect(res.body.data.timezone).toBe('America/New_York');
      expect(res.body.data.source).toBe('MANUAL');
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('rejects event with end time before start time', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...validEvent,
          endTime: new Date(tomorrow.getTime() - 3600000).toISOString(),
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects event without authentication', async () => {
      await getRequest()
        .post('/api/events')
        .send(validEvent)
        .expect(401);
    });

    it('rejects event with missing title', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validEvent, title: '' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects event with invalid timezone', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validEvent, timezone: 'InvalidTZ' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/events', () => {
    it('lists events for authenticated user', async () => {
      const { token } = await createAuthenticatedUser();

      // Create an event first
      await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(validEvent)
        .expect(201);

      const res = await getRequest()
        .get('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('returns empty list for user with no events', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .get('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/events/:id', () => {
    it('returns a specific event', async () => {
      const { token } = await createAuthenticatedUser();

      const createRes = await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(validEvent)
        .expect(201);

      const eventId = createRes.body.data.id;

      const res = await getRequest()
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.id).toBe(eventId);
    });

    it('returns 404 for non-existent event', async () => {
      const { token } = await createAuthenticatedUser();

      await getRequest()
        .get('/api/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /api/events/:id', () => {
    it('updates an event', async () => {
      const { token } = await createAuthenticatedUser();

      const createRes = await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(validEvent)
        .expect(201);

      const eventId = createRes.body.data.id;

      const res = await getRequest()
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Meeting' })
        .expect(200);

      expect(res.body.data.title).toBe('Updated Meeting');
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('deletes an event', async () => {
      const { token } = await createAuthenticatedUser();

      const createRes = await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(validEvent)
        .expect(201);

      const eventId = createRes.body.data.id;

      await getRequest()
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Verify deleted
      await getRequest()
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('User isolation', () => {
    it('user A cannot access user B events', async () => {
      const userA = await createAuthenticatedUser({ email: 'usera@example.com', password: 'StrongPass1' });
      const userB = await createAuthenticatedUser({ email: 'userb@example.com', password: 'StrongPass1' });

      // User A creates an event
      const createRes = await getRequest()
        .post('/api/events')
        .set('Authorization', `Bearer ${userA.token}`)
        .send(validEvent)
        .expect(201);

      const eventId = createRes.body.data.id;

      // User B tries to access it
      await getRequest()
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(404);

      // User B tries to update it
      await getRequest()
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ title: 'Hacked' })
        .expect(404);

      // User B tries to delete it
      await getRequest()
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(404);

      // User B's event list is empty
      const listRes = await getRequest()
        .get('/api/events')
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(0);
    });
  });
});
