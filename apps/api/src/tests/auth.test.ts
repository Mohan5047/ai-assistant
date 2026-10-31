import { describe, it, expect } from 'vitest';
import { getRequest, createTestUser, createAuthenticatedUser } from './helpers.js';

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user successfully', async () => {
      const res = await getRequest()
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'StrongPass1',
          displayName: 'New User',
          timezone: 'America/New_York',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newuser@example.com');
      expect(res.body.data.user.displayName).toBe('New User');
      expect(res.body.data.user.timezone).toBe('America/New_York');
      expect(res.body.data.token).toBeDefined();
      // Should not expose password
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects registration with invalid email', async () => {
      const res = await getRequest()
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'StrongPass1',
          displayName: 'Test',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with weak password', async () => {
      const res = await getRequest()
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          displayName: 'Test',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('rejects duplicate email', async () => {
      await createTestUser({ email: 'dupe@example.com' });

      const res = await getRequest()
        .post('/api/auth/register')
        .send({
          email: 'dupe@example.com',
          password: 'StrongPass1',
          displayName: 'Dupe',
        })
        .expect(409);

      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('normalizes email to lowercase', async () => {
      const res = await getRequest()
        .post('/api/auth/register')
        .send({
          email: 'UPPER@EXAMPLE.COM',
          password: 'StrongPass1',
          displayName: 'Upper',
        })
        .expect(201);

      expect(res.body.data.user.email).toBe('upper@example.com');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in successfully with valid credentials', async () => {
      await createTestUser({ email: 'login@example.com', password: 'StrongPass1' });

      const res = await getRequest()
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'StrongPass1' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('login@example.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects login with wrong password', async () => {
      await createTestUser({ email: 'wrong@example.com', password: 'StrongPass1' });

      const res = await getRequest()
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'WrongPass1' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects login with non-existent email with generic error', async () => {
      const res = await getRequest()
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'StrongPass1' })
        .expect(401);

      // Should NOT say "user not found" - generic error to prevent enumeration
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user with valid token', async () => {
      const { token, email } = await createAuthenticatedUser({ email: 'me@example.com' });

      const res = await getRequest()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.user.email).toBe(email);
    });

    it('rejects request without token', async () => {
      const res = await getRequest()
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects request with invalid token', async () => {
      const res = await getRequest()
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logs out successfully', async () => {
      const res = await getRequest()
        .post('/api/auth/logout')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/google', () => {
    it('handles Google sign in with mocked token verification', async () => {
      // Mock OAuth2Client verifyIdToken
      const { OAuth2Client } = await import('google-auth-library');
      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
        getPayload: () => ({
          sub: 'google-uid-12345',
          email: 'googleuser@example.com',
          name: 'Google User',
        }),
      } as any);

      // Set temporary GOOGLE_CLIENT_ID
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';

      const res = await getRequest()
        .post('/api/auth/google')
        .send({ idToken: 'valid-mock-token' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('googleuser@example.com');
      expect(res.body.data.user.displayName).toBe('Google User');
      expect(res.body.data.token).toBeDefined();

      spy.mockRestore();
    });

    it('rejects invalid Google token', async () => {
      const { OAuth2Client } = await import('google-auth-library');
      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValueOnce(
        new Error('Token verification failed')
      );

      process.env.GOOGLE_CLIENT_ID = 'test-client-id';

      const res = await getRequest()
        .post('/api/auth/google')
        .send({ idToken: 'invalid-token' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_TOKEN');

      spy.mockRestore();
    });
  });
});
