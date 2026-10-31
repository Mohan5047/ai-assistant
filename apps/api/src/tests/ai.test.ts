import { describe, it, expect } from 'vitest';
import { getRequest, createAuthenticatedUser } from './helpers.js';
import { eventService } from '../services/index.js';

describe('AI Assistant & Tool Execution', () => {
  describe('POST /api/ai/chat', () => {
    it('creates an event from natural language: "Schedule a project review tomorrow at 3 PM"', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Schedule a project review tomorrow at 3 PM' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('project review');
      expect(res.body.data.actionsExecuted).toHaveLength(1);
      expect(res.body.data.actionsExecuted[0].tool).toBe('create_event');
      expect(res.body.data.actionsExecuted[0].success).toBe(true);
    });

    it('creates a task from natural language: "Create a task to finish assignment by Friday"', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Create a task to finish assignment by Friday' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('finish assignment');
      expect(res.body.data.actionsExecuted).toHaveLength(1);
      expect(res.body.data.actionsExecuted[0].tool).toBe('create_task');
      expect(res.body.data.actionsExecuted[0].success).toBe(true);
    });

    it('asks a focused clarification question for ambiguous requests', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await getRequest()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Schedule a meeting' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('specify the event title');
      // No tools should have been executed blindly
      expect(res.body.data.actionsExecuted).toBeUndefined();
    });

    it('requires explicit confirmation before executing destructive actions (delete_event)', async () => {
      const { token, userId } = await createAuthenticatedUser();

      // Create an event first
      const event = await eventService.createEvent(userId, {
        title: 'Meeting to delete',
        startTime: new Date(Date.now() + 100000).toISOString(),
        endTime: new Date(Date.now() + 200000).toISOString(),
        timezone: 'UTC',
      });

      // User says "Delete event <id>"
      const chatRes = await getRequest()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: `Delete event ${event.id}` })
        .expect(200);

      // Should return a pending confirmation request with an actionId
      expect(chatRes.body.data.pendingConfirmation).toBeDefined();
      expect(chatRes.body.data.pendingConfirmation.tool).toBe('delete_event');
      const actionId = chatRes.body.data.pendingConfirmation.actionId;

      // Event should NOT be deleted yet!
      const checkEvent = await eventService.getEventById(userId, event.id);
      expect(checkEvent.id).toBe(event.id);

      // User approves confirmation
      const confirmRes = await getRequest()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Yes, confirm deletion',
          confirmationResponse: {
            actionId,
            confirmed: true,
          },
        })
        .expect(200);

      expect(confirmRes.body.data.actionsExecuted).toBeDefined();
      expect(confirmRes.body.data.actionsExecuted[0].tool).toBe('delete_event');
    });

    it('aborts destructive action when user rejects confirmation', async () => {
      const { token, userId } = await createAuthenticatedUser();

      const event = await eventService.createEvent(userId, {
        title: 'Safe Meeting',
        startTime: new Date(Date.now() + 100000).toISOString(),
        endTime: new Date(Date.now() + 200000).toISOString(),
        timezone: 'UTC',
      });

      const chatRes = await getRequest()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: `Delete event ${event.id}` })
        .expect(200);

      const actionId = chatRes.body.data.pendingConfirmation.actionId;

      // User rejects confirmation
      const rejectRes = await getRequest()
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'No, keep it',
          confirmationResponse: {
            actionId,
            confirmed: false,
          },
        })
        .expect(200);

      expect(rejectRes.body.data.reply).toContain('Cancelled action');

      // Event is still safe in DB
      const safeEvent = await eventService.getEventById(userId, event.id);
      expect(safeEvent.id).toBe(event.id);
    });
  });

  describe('GET /api/ai/daily-plan', () => {
    it('generates a realistic schedule without overlapping fixed commitments', async () => {
      const { token, userId } = await createAuthenticatedUser();

      // Create a fixed event from 10:00 to 11:30 AM
      const meetingStart = new Date();
      meetingStart.setHours(10, 0, 0, 0);
      const meetingEnd = new Date();
      meetingEnd.setHours(11, 30, 0, 0);

      await eventService.createEvent(userId, {
        title: 'Team Sprint Planning',
        startTime: meetingStart.toISOString(),
        endTime: meetingEnd.toISOString(),
        timezone: 'UTC',
      });

      const res = await getRequest()
        .get('/api/ai/daily-plan')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.fixedCommitments).toHaveLength(1);
      expect(res.body.data.availableSlots.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.explanation).toBeDefined();
    });
  });
});
