import { describe, it, expect } from 'vitest';
import { getRequest, createAuthenticatedUser } from './helpers.js';

describe('Tasks API', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(17, 0, 0, 0);

  const validTask = {
    title: 'Complete Project Report',
    description: 'Draft executive summary and architecture diagrams',
    priority: 'HIGH',
    status: 'TODO',
    dueDate: tomorrow.toISOString(),
    timezone: 'UTC',
  };

  describe('POST /api/tasks', () => {
    it('creates a task successfully', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(validTask)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(validTask.title);
      expect(res.body.data.priority).toBe('HIGH');
      expect(res.body.data.status).toBe('TODO');
      expect(res.body.data.dueDate).toBeDefined();
    });

    it('rejects task creation without title', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validTask, title: '' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('requires authentication', async () => {
      await getRequest()
        .post('/api/tasks')
        .send(validTask)
        .expect(401);
    });
  });

  describe('GET /api/tasks', () => {
    it('lists tasks with filtering and pagination', async () => {
      const { token } = await createAuthenticatedUser();

      // Create two tasks with different priorities
      await getRequest()
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validTask, title: 'Task 1', priority: 'HIGH' })
        .expect(201);

      await getRequest()
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validTask, title: 'Task 2', priority: 'LOW' })
        .expect(201);

      const res = await getRequest()
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);

      // Filter by priority
      const highRes = await getRequest()
        .get('/api/tasks?priority=HIGH')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(highRes.body.data).toHaveLength(1);
      expect(highRes.body.data[0].title).toBe('Task 1');
    });
  });

  describe('POST /api/tasks/:id/complete', () => {
    it('marks task as completed with completedAt timestamp', async () => {
      const { token } = await createAuthenticatedUser();

      const createRes = await getRequest()
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(validTask)
        .expect(201);

      const taskId = createRes.body.data.id;

      const completeRes = await getRequest()
        .post(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(completeRes.body.data.status).toBe('DONE');
      expect(completeRes.body.data.completedAt).toBeDefined();
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('updates task properties', async () => {
      const { token } = await createAuthenticatedUser();

      const createRes = await getRequest()
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(validTask)
        .expect(201);

      const taskId = createRes.body.data.id;

      const updateRes = await getRequest()
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title', priority: 'URGENT' })
        .expect(200);

      expect(updateRes.body.data.title).toBe('Updated Title');
      expect(updateRes.body.data.priority).toBe('URGENT');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes task cleanly', async () => {
      const { token } = await createAuthenticatedUser();

      const createRes = await getRequest()
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(validTask)
        .expect(201);

      const taskId = createRes.body.data.id;

      await getRequest()
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await getRequest()
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('User Isolation', () => {
    it('prevents User A from reading or mutating User B tasks', async () => {
      const userA = await createAuthenticatedUser({ email: 'usera-tasks@example.com' });
      const userB = await createAuthenticatedUser({ email: 'userb-tasks@example.com' });

      // User A creates task
      const createRes = await getRequest()
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userA.token}`)
        .send(validTask)
        .expect(201);

      const taskId = createRes.body.data.id;

      // User B tries to read, complete, and delete it -> all 404
      await getRequest()
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(404);

      await getRequest()
        .post(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(404);

      await getRequest()
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(404);
    });
  });
});
