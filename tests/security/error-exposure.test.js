const express = require('express');
const request = require('supertest');
const { createMockPool } = require('../helpers/mockPool');

describe('VULNERABILITE: Exposition des stack traces dans les erreurs', () => {

  // ============================================================
  // VERSION INSECURE - Stack trace exposee au client
  // ============================================================
  describe('VERSION INSECURE - les erreurs exposent les details internes', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      app = express();
      app.use(express.json());

      // Reproduction du code VULNERABLE original (users.js)
      app.post('/api/users', async (req, res) => {
        try {
          const { email, password, role } = req.body;
          const query = `INSERT INTO users (username, email, password, role)
                         VALUES ('${email}', '${email}', '${password}', '${role}')`;
          await mockPool.query(query);
          res.json({ success: true });
        } catch (err) {
          // VULNERABLE : Expose err.message ET err.stack
          res.status(500).json({
            error: err.message,
            stack: err.stack
          });
        }
      });
    });

    test('une erreur DB expose le stack trace complet au client', async () => {
      const dbError = new Error('duplicate key value violates unique constraint "users_email_key"');
      dbError.stack = 'Error: duplicate key value\n    at Pool.query (/app/node_modules/pg/lib/pool.js:123)\n    at /app/src/api/users.js:15:20';
      mockPool.query.mockRejectedValueOnce(dbError);

      const response = await request(app)
        .post('/api/users')
        .send({ email: 'test@test.com', password: 'pass', role: 'user' })
        .expect(500);

      // PREUVE : Le stack trace est visible dans la reponse
      expect(response.body.stack).toBeDefined();
      expect(response.body.stack).toContain('node_modules');
      expect(response.body.error).toContain('duplicate key');
    });

    test('une erreur de connexion expose les details du serveur', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:5432'));

      const response = await request(app)
        .post('/api/users')
        .send({ email: 'test@test.com', password: 'pass', role: 'user' })
        .expect(500);

      // PREUVE : L'adresse IP et le port de la DB sont exposes
      expect(response.body.error).toContain('ECONNREFUSED');
      expect(response.body.error).toContain('127.0.0.1:5432');
    });
  });

  // ============================================================
  // VERSION SECURE - Message generique, pas de details
  // ============================================================
  describe('VERSION SECURE - message d\'erreur generique sans details internes', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createUsersRouter = require('../../src/api/users');
      const usersRouter = createUsersRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api', usersRouter);
    });

    test('une erreur DB retourne un message generique sans stack trace', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

      const response = await request(app)
        .post('/api/users')
        .send({ email: 'test@test.com', password: 'SecurePass1!' })
        .expect(500);

      // PREUVE : Pas de stack trace, message generique
      expect(response.body.stack).toBeUndefined();
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.error).not.toContain('duplicate key');
    });

    test('une erreur de connexion ne revele pas les details du serveur', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:5432'));

      const response = await request(app)
        .post('/api/users')
        .send({ email: 'test@test.com', password: 'SecurePass1!' })
        .expect(500);

      expect(response.body.error).not.toContain('ECONNREFUSED');
      expect(response.body.error).not.toContain('127.0.0.1');
    });
  });

  // ============================================================
  // Login - meme verification
  // ============================================================
  describe('VERSION SECURE - Login ne revele pas les erreurs internes', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createLoginRouter = require('../../src/auth/login');
      const loginRouter = createLoginRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api/auth', loginRouter);
    });

    test('une erreur de connexion ne revele pas les details', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'pass' })
        .expect(500);

      expect(response.body.stack).toBeUndefined();
      expect(response.body.error).not.toContain('ECONNREFUSED');
    });
  });
});
