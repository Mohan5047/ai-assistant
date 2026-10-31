import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export interface MockUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  googleId: string | null;
  timezone: string;
  preferredLanguage: string;
  notificationPreferences: Record<string, unknown>;
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: Date;
  updatedAt: Date;
}

export interface MockEventRecord {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAllDay: boolean;
  source: 'MANUAL' | 'GOOGLE_CALENDAR' | 'AI_SUGGESTED';
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  googleEventId: string | null;
  calendarId: string | null;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED' | 'NOT_APPLICABLE';
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockTaskRecord {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  dueDate: Date | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  timezone: string;
  eventId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockReminderRecord {
  id: string;
  userId: string;
  eventId: string | null;
  taskId: string | null;
  type: 'EMAIL' | 'PUSH' | 'BOTH';
  scheduledAt: Date;
  timezone: string;
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  deliveredAt: Date | null;
  failureReason: string | null;
  attempts: number;
  createdAt: Date;
}

export interface MockCalendarConnRecord {
  id: string;
  userId: string;
  provider: string;
  accountEmail: string;
  calendarId: string | null;
  syncToken: string | null;
  encryptedTokens: string;
  tokenIv: string;
  grantedScopes: string[];
  isActive: boolean;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAiThreadRecord {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAiMessageRecord {
  id: string;
  threadId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  toolCalls: any;
  toolResults: any;
  createdAt: Date;
}

export interface MockDeviceRecord {
  id: string;
  userId: string;
  token: string;
  platform: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockPasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export function createMockPrismaClient(): PrismaClient {
  const users: MockUserRecord[] = [];
  const events: MockEventRecord[] = [];
  const tasks: MockTaskRecord[] = [];
  const reminders: MockReminderRecord[] = [];
  const calendarConnections: MockCalendarConnRecord[] = [];
  const aiThreads: MockAiThreadRecord[] = [];
  const aiMessages: MockAiMessageRecord[] = [];
  const devices: MockDeviceRecord[] = [];
  const passwordResetTokens: MockPasswordResetTokenRecord[] = [];

  const mockClient = {
    $connect: async () => {},
    $disconnect: async () => {},
    $queryRaw: async () => [{ 1: 1 }],
    $executeRaw: async () => 0,

    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string; googleId?: string } }) => {
        return users.find((u) => {
          if (where.email && u.email === where.email.toLowerCase().trim()) return true;
          if (where.id && u.id === where.id) return true;
          if (where.googleId && u.googleId === where.googleId) return true;
          return false;
        }) || null;
      },
      create: async ({ data }: { data: Partial<MockUserRecord> }) => {
        const user: MockUserRecord = {
          id: data.id || crypto.randomUUID(),
          email: (data.email || '').toLowerCase().trim(),
          displayName: data.displayName || '',
          passwordHash: data.passwordHash || null,
          googleId: data.googleId || null,
          timezone: data.timezone || 'UTC',
          preferredLanguage: data.preferredLanguage || 'en',
          notificationPreferences: (data.notificationPreferences as Record<string, unknown>) || {
            email: true,
            push: true,
            reminderMinutesBefore: 15,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
          },
          accountStatus: data.accountStatus || 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(user);
        return user;
      },
      update: async ({ where, data }: { where: { id?: string; email?: string }; data: any }) => {
        const user = users.find((u) => (where.id && u.id === where.id) || (where.email && u.email === where.email.toLowerCase().trim()));
        if (!user) throw new Error('User not found');
        if (data.displayName !== undefined) user.displayName = data.displayName;
        if (data.timezone !== undefined) user.timezone = data.timezone;
        if (data.preferredLanguage !== undefined) user.preferredLanguage = data.preferredLanguage;
        if (data.passwordHash !== undefined) user.passwordHash = data.passwordHash;
        if (data.notificationPreferences !== undefined) {
          user.notificationPreferences = { ...user.notificationPreferences, ...data.notificationPreferences };
        }
        user.updatedAt = new Date();
        return user;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = users.findIndex((u) => u.id === where.id);
        if (index === -1) throw new Error('User not found');
        const deleted = users.splice(index, 1)[0]!;
        for (let i = events.length - 1; i >= 0; i--) if (events[i]!.userId === where.id) events.splice(i, 1);
        for (let i = tasks.length - 1; i >= 0; i--) if (tasks[i]!.userId === where.id) tasks.splice(i, 1);
        for (let i = reminders.length - 1; i >= 0; i--) if (reminders[i]!.userId === where.id) reminders.splice(i, 1);
        for (let i = calendarConnections.length - 1; i >= 0; i--) if (calendarConnections[i]!.userId === where.id) calendarConnections.splice(i, 1);
        for (let i = aiThreads.length - 1; i >= 0; i--) if (aiThreads[i]!.userId === where.id) aiThreads.splice(i, 1);
        for (let i = devices.length - 1; i >= 0; i--) if (devices[i]!.userId === where.id) devices.splice(i, 1);
        for (let i = passwordResetTokens.length - 1; i >= 0; i--) if (passwordResetTokens[i]!.userId === where.id) passwordResetTokens.splice(i, 1);
        return deleted;
      },
    },

    event: {
      create: async ({ data }: { data: any }) => {
        const event: MockEventRecord = {
          id: data.id || crypto.randomUUID(),
          userId: data.userId,
          title: data.title,
          description: data.description ?? null,
          location: data.location ?? null,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          timezone: data.timezone || 'UTC',
          isAllDay: data.isAllDay ?? false,
          source: data.source || 'MANUAL',
          status: data.status || 'CONFIRMED',
          googleEventId: data.googleEventId ?? null,
          calendarId: data.calendarId ?? null,
          syncStatus: data.syncStatus || 'NOT_APPLICABLE',
          lastSyncedAt: data.lastSyncedAt ? new Date(data.lastSyncedAt) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        events.push(event);
        return event;
      },
      findFirst: async ({ where }: { where: { id?: string; userId?: string; googleEventId?: string } }) => {
        return events.find((e) => {
          if (where.id && e.id !== where.id) return false;
          if (where.userId && e.userId !== where.userId) return false;
          if (where.googleEventId && e.googleEventId !== where.googleEventId) return false;
          return true;
        }) || null;
      },
      findMany: async ({
        where = {},
        orderBy,
        skip = 0,
        take = 20,
      }: {
        where?: any;
        orderBy?: any;
        skip?: number;
        take?: number;
      }) => {
        let filtered = events.filter((e) => {
          if (where.userId && e.userId !== where.userId) return false;
          if (where.source && e.source !== where.source) return false;
          if (where.googleEventId === null && e.googleEventId !== null) return false;
          if (where.status) {
            if (typeof where.status === 'string' && e.status !== where.status) return false;
            if (where.status.not && e.status === where.status.not) return false;
          }
          if (where.startTime) {
            if (where.startTime.gte && e.startTime < new Date(where.startTime.gte)) return false;
            if (where.startTime.lte && e.startTime > new Date(where.startTime.lte)) return false;
            if (where.startTime.gt && e.startTime <= new Date(where.startTime.gt)) return false;
            if (where.startTime.lt && e.startTime >= new Date(where.startTime.lt)) return false;
          }
          if (where.endTime) {
            if (where.endTime.lte && e.endTime > new Date(where.endTime.lte)) return false;
            if (where.endTime.gt && e.endTime <= new Date(where.endTime.gt)) return false;
          }
          if (where.title && where.title.contains) {
            const search = where.title.contains.toLowerCase();
            if (!e.title.toLowerCase().includes(search)) return false;
          }
          return true;
        });

        if (orderBy) {
          const [field, dir] = Object.entries(Array.isArray(orderBy) ? orderBy[0] : orderBy)[0] || ['startTime', 'asc'];
          filtered.sort((a, b) => {
            const aVal = (a as any)[field];
            const bVal = (b as any)[field];
            if (aVal < bVal) return dir === 'asc' ? -1 : 1;
            if (aVal > bVal) return dir === 'asc' ? 1 : -1;
            return 0;
          });
        }

        return filtered.slice(skip, skip + take);
      },
      count: async ({ where }: { where: any }) => {
        const matching = await mockClient.event.findMany({ where, skip: 0, take: 999999 });
        return matching.length;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const index = events.findIndex((e) => e.id === where.id);
        if (index === -1) throw new Error('Record not found');
        const existing = events[index]!;
        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        events[index] = updated;
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = events.findIndex((e) => e.id === where.id);
        if (index === -1) throw new Error('Record not found');
        const removed = events.splice(index, 1)[0]!;
        return removed;
      },
    },

    task: {
      create: async ({ data }: { data: any }) => {
        const task: MockTaskRecord = {
          id: data.id || crypto.randomUUID(),
          userId: data.userId,
          title: data.title,
          description: data.description ?? null,
          priority: data.priority || 'MEDIUM',
          status: data.status || 'TODO',
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
          scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
          timezone: data.timezone || 'UTC',
          eventId: data.eventId ?? null,
          completedAt: data.completedAt ? new Date(data.completedAt) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        tasks.push(task);
        return task;
      },
      findFirst: async ({ where }: { where: { id?: string; userId?: string } }) => {
        return tasks.find((t) => {
          if (where.id && t.id !== where.id) return false;
          if (where.userId && t.userId !== where.userId) return false;
          return true;
        }) || null;
      },
      findMany: async ({
        where = {},
        orderBy,
        skip = 0,
        take = 20,
      }: {
        where?: any;
        orderBy?: any;
        skip?: number;
        take?: number;
      }) => {
        let filtered = tasks.filter((t) => {
          if (where.userId && t.userId !== where.userId) return false;
          if (where.status) {
            if (typeof where.status === 'string' && t.status !== where.status) return false;
            if (where.status.notIn && where.status.notIn.includes(t.status)) return false;
          }
          if (where.priority && t.priority !== where.priority) return false;
          if (where.dueDate) {
            if (where.dueDate.gte && (!t.dueDate || t.dueDate < new Date(where.dueDate.gte))) return false;
            if (where.dueDate.lte && (!t.dueDate || t.dueDate > new Date(where.dueDate.lte))) return false;
            if (where.dueDate.lt && (!t.dueDate || t.dueDate >= new Date(where.dueDate.lt))) return false;
          }
          if (where.search && where.title && where.title.contains) {
            if (!t.title.toLowerCase().includes(where.title.contains.toLowerCase())) return false;
          }
          return true;
        });

        return filtered.slice(skip, skip + take);
      },
      count: async ({ where }: { where: any }) => {
        const matching = await mockClient.task.findMany({ where, skip: 0, take: 999999 });
        return matching.length;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const index = tasks.findIndex((t) => t.id === where.id);
        if (index === -1) throw new Error('Task not found');
        const existing = tasks[index]!;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        tasks[index] = updated;
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = tasks.findIndex((t) => t.id === where.id);
        if (index === -1) throw new Error('Task not found');
        return tasks.splice(index, 1)[0]!;
      },
    },

    reminder: {
      create: async ({ data }: { data: any }) => {
        const reminder: MockReminderRecord = {
          id: data.id || crypto.randomUUID(),
          userId: data.userId,
          eventId: data.eventId ?? null,
          taskId: data.taskId ?? null,
          type: data.type || 'BOTH',
          scheduledAt: new Date(data.scheduledAt),
          timezone: data.timezone || 'UTC',
          deliveryStatus: data.deliveryStatus || 'PENDING',
          deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : null,
          failureReason: data.failureReason ?? null,
          attempts: data.attempts || 0,
          createdAt: new Date(),
        };
        reminders.push(reminder);
        return reminder;
      },
      findUnique: async ({ where, include }: { where: { id: string }; include?: any }) => {
        const rem = reminders.find((r) => r.id === where.id);
        if (!rem) return null;
        if (include) {
          const u = users.find((u) => u.id === rem.userId);
          const ev = rem.eventId ? events.find((e) => e.id === rem.eventId) : null;
          const t = rem.taskId ? tasks.find((tk) => tk.id === rem.taskId) : null;
          return { ...rem, user: u, event: ev, task: t };
        }
        return rem;
      },
      findFirst: async ({ where }: { where: any }) => {
        return reminders.find((r) => {
          if (where.userId && r.userId !== where.userId) return false;
          if (where.eventId !== undefined && r.eventId !== where.eventId) return false;
          if (where.taskId !== undefined && r.taskId !== where.taskId) return false;
          if (where.deliveryStatus && r.deliveryStatus !== where.deliveryStatus) return false;
          return true;
        }) || null;
      },
      findMany: async ({ where = {} }: { where?: any }) => {
        return reminders.filter((r) => {
          if (where.userId && r.userId !== where.userId) return false;
          if (where.deliveryStatus && r.deliveryStatus !== where.deliveryStatus) return false;
          return true;
        });
      },
      count: async ({ where = {} }: { where?: any }) => {
        return (await mockClient.reminder.findMany({ where })).length;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const index = reminders.findIndex((r) => r.id === where.id);
        if (index === -1) throw new Error('Reminder not found');
        const updated = { ...reminders[index]!, ...data };
        reminders[index] = updated;
        return updated;
      },
      updateMany: async ({ where, data }: { where: any; data: any }) => {
        let count = 0;
        for (let i = 0; i < reminders.length; i++) {
          const r = reminders[i]!;
          if (where.eventId && r.eventId === where.eventId) {
            reminders[i] = { ...r, ...data };
            count++;
          } else if (where.taskId && r.taskId === where.taskId) {
            reminders[i] = { ...r, ...data };
            count++;
          }
        }
        return { count };
      },
    },

    calendarConnection: {
      findFirst: async ({ where }: { where: any }) => {
        return calendarConnections.find((c) => {
          if (where.userId && c.userId !== where.userId) return false;
          if (where.provider && c.provider !== where.provider) return false;
          if (where.isActive !== undefined && c.isActive !== where.isActive) return false;
          return true;
        }) || null;
      },
      create: async ({ data }: { data: any }) => {
        const conn: MockCalendarConnRecord = {
          id: data.id || crypto.randomUUID(),
          userId: data.userId,
          provider: data.provider || 'google',
          accountEmail: data.accountEmail,
          calendarId: data.calendarId ?? 'primary',
          syncToken: data.syncToken ?? null,
          encryptedTokens: data.encryptedTokens,
          tokenIv: data.tokenIv,
          grantedScopes: data.grantedScopes || [],
          isActive: data.isActive ?? true,
          lastSyncedAt: data.lastSyncedAt ? new Date(data.lastSyncedAt) : null,
          lastSyncError: data.lastSyncError ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        calendarConnections.push(conn);
        return conn;
      },
      upsert: async ({ where, update, create }: { where: any; update: any; create: any }) => {
        const index = calendarConnections.findIndex((c) => {
          if (where.userId_provider_accountEmail) {
            return (
              c.userId === where.userId_provider_accountEmail.userId &&
              c.provider === where.userId_provider_accountEmail.provider &&
              c.accountEmail === where.userId_provider_accountEmail.accountEmail
            );
          }
          return false;
        });

        if (index >= 0) {
          const updated = { ...calendarConnections[index]!, ...update, updatedAt: new Date() };
          calendarConnections[index] = updated;
          return updated;
        }

        return mockClient.calendarConnection.create({ data: create });
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const index = calendarConnections.findIndex((c) => c.id === where.id);
        if (index === -1) throw new Error('Connection not found');
        const updated = { ...calendarConnections[index]!, ...data, updatedAt: new Date() };
        calendarConnections[index] = updated;
        return updated;
      },
    },

    aiThread: {
      create: async ({ data }: { data: any }) => {
        const thread: MockAiThreadRecord = {
          id: data.id || crypto.randomUUID(),
          userId: data.userId,
          title: data.title ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        aiThreads.push(thread);
        return thread;
      },
      findFirst: async ({ where, include }: { where: any; include?: any }) => {
        const th = aiThreads.find((t) => {
          if (where.id && t.id !== where.id) return false;
          if (where.userId && t.userId !== where.userId) return false;
          return true;
        });
        if (!th) return null;
        if (include?.messages) {
          const msgs = aiMessages.filter((m) => m.threadId === th.id);
          return { ...th, messages: msgs };
        }
        return th;
      },
      findMany: async ({ where }: { where: any }) => {
        const ths = aiThreads.filter((t) => t.userId === where.userId);
        return ths.map((t) => {
          const msgs = aiMessages.filter((m) => m.threadId === t.id);
          return { ...t, messages: msgs.slice(-1) };
        });
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = aiThreads.findIndex((t) => t.id === where.id);
        if (index === -1) throw new Error('Thread not found');
        return aiThreads.splice(index, 1)[0]!;
      },
    },

    aiMessage: {
      create: async ({ data }: { data: any }) => {
        const msg: MockAiMessageRecord = {
          id: data.id || crypto.randomUUID(),
          threadId: data.threadId,
          role: data.role,
          content: data.content,
          toolCalls: data.toolCalls ?? null,
          toolResults: data.toolResults ?? null,
          createdAt: new Date(),
        };
        aiMessages.push(msg);
        return msg;
      },
      findMany: async ({ where }: { where: any }) => {
        return aiMessages.filter((m) => m.threadId === where.threadId);
      },
    },

    device: {
      create: async ({ data }: { data: any }) => {
        const dev: MockDeviceRecord = {
          id: data.id || crypto.randomUUID(),
          userId: data.userId,
          token: data.token,
          platform: data.platform,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devices.push(dev);
        return dev;
      },
      upsert: async ({ where, create, update }: { where: { token: string }; create: any; update: any }) => {
        const existing = devices.find((d) => d.token === where.token);
        if (existing) {
          if (update.userId !== undefined) existing.userId = update.userId;
          if (update.platform !== undefined) existing.platform = update.platform;
          if (update.isActive !== undefined) existing.isActive = update.isActive;
          existing.updatedAt = new Date();
          return existing;
        }
        const dev: MockDeviceRecord = {
          id: create.id || crypto.randomUUID(),
          userId: create.userId,
          token: create.token,
          platform: create.platform,
          isActive: create.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devices.push(dev);
        return dev;
      },
      findUnique: async ({ where }: { where: { token?: string; id?: string } }) => {
        return devices.find((d) => (where.token && d.token === where.token) || (where.id && d.id === where.id)) || null;
      },
      findFirst: async ({ where }: { where: any }) => {
        return devices.find((d) => {
          if (where.userId && d.userId !== where.userId) return false;
          if (where.token && d.token !== where.token) return false;
          if (where.isActive !== undefined && d.isActive !== where.isActive) return false;
          return true;
        }) || null;
      },
      findMany: async ({ where }: { where?: any }) => {
        if (!where) return devices;
        return devices.filter((d) => {
          if (where.userId && d.userId !== where.userId) return false;
          if (where.isActive !== undefined && d.isActive !== where.isActive) return false;
          return true;
        });
      },
      update: async ({ where, data }: { where: { token?: string; id?: string }; data: any }) => {
        const dev = devices.find((d) => (where.token && d.token === where.token) || (where.id && d.id === where.id));
        if (!dev) throw new Error('Device not found');
        if (data.isActive !== undefined) dev.isActive = data.isActive;
        dev.updatedAt = new Date();
        return dev;
      },
      delete: async ({ where }: { where: { token?: string; id?: string } }) => {
        const idx = devices.findIndex((d) => (where.token && d.token === where.token) || (where.id && d.id === where.id));
        if (idx === -1) throw new Error('Device not found');
        return devices.splice(idx, 1)[0]!;
      },
      deleteMany: async ({ where }: { where?: any }) => {
        let count = 0;
        for (let i = devices.length - 1; i >= 0; i--) {
          const d = devices[i]!;
          if (!where || (where.userId && d.userId === where.userId) || (where.token && d.token === where.token)) {
            devices.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
    },

    passwordResetToken: {
      create: async ({ data }: { data: any }) => {
        const tokenRec: MockPasswordResetTokenRecord = {
          id: data.id || crypto.randomUUID(),
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: new Date(data.expiresAt),
          usedAt: data.usedAt ? new Date(data.usedAt) : null,
          createdAt: new Date(),
        };
        passwordResetTokens.push(tokenRec);
        return tokenRec;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) => {
        return passwordResetTokens.find((t) => t.tokenHash === where.tokenHash) || null;
      },
      update: async ({ where, data }: { where: { tokenHash: string }; data: any }) => {
        const tokenRec = passwordResetTokens.find((t) => t.tokenHash === where.tokenHash);
        if (!tokenRec) throw new Error('Password reset token not found');
        if (data.usedAt !== undefined) tokenRec.usedAt = data.usedAt ? new Date(data.usedAt) : null;
        return tokenRec;
      },
      deleteMany: async ({ where }: { where?: any }) => {
        let count = 0;
        for (let i = passwordResetTokens.length - 1; i >= 0; i--) {
          const t = passwordResetTokens[i]!;
          if (!where || (where.userId && t.userId === where.userId)) {
            passwordResetTokens.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
    },

    __clearAll: () => {
      users.length = 0;
      events.length = 0;
      tasks.length = 0;
      reminders.length = 0;
      calendarConnections.length = 0;
      aiThreads.length = 0;
      aiMessages.length = 0;
      devices.length = 0;
      passwordResetTokens.length = 0;
    },
  };

  return mockClient as unknown as PrismaClient & { __clearAll: () => void };
}
