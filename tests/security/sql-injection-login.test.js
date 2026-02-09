const express = require('express');
const request = require('supertest');
const { createMockPool } = require('../helpers/mockPool');

describe('VULNERABILITE: SQL Injection dans POST /api/auth/login', () => {

  // ============================================================
  // VERSION INSECURE - Demontre la vulnerabilite
  // ============================================================
  describe('VERSION INSECURE - string interpolation permet l\'injection SQL', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      app = express();
      app.use(express.json());

      // Reproduction du code VULNERABLE original (avant refactoring)
      app.post('/api/auth/login', async (req, res) => {
        const { username, password } = req.body;
        // VULNERABLE : String interpolation directe
        const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
        const result = await mockPool.query(query);
        if (result.rows.length > 0) {
          res.json({ success: true, user: result.rows[0] });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });
    });

    test('injection OR 1=1 bypass l\'authentification', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'admin', role: 'admin' }]
      });

      await request(app)
        .post('/api/auth/login')
        .send({ username: "' OR '1'='1' --", password: 'anything' })
        .expect(200);

      // PREUVE : La requete SQL generee contient le payload d'injection
      const executedQuery = mockPool.query.mock.calls[0][0];
      expect(executedQuery).toContain("OR '1'='1'");
      expect(executedQuery).toContain('--');
    });

    test('injection UNION SELECT permet d\'extraire des donnees', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'admin', password: 'admin123' }]
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          username: "' UNION SELECT id, username, password, email, role, created_at FROM users --",
          password: 'x'
        })
        .expect(200);

      const executedQuery = mockPool.query.mock.calls[0][0];
      expect(executedQuery).toContain('UNION SELECT');
    });

    test('injection DROP TABLE peut detruire la base', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/auth/login')
        .send({ username: "'; DROP TABLE users; --", password: 'x' });

      const executedQuery = mockPool.query.mock.calls[0][0];
      expect(executedQuery).toContain('DROP TABLE users');
    });
  });

  // ============================================================
  // VERSION SECURE - Requetes parametrees bloquent l'injection
  // ============================================================
  describe('VERSION SECURE - requetes parametrees empechent l\'injection', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createLoginRouter = require('../../src/auth/login');
      const loginRouter = createLoginRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api/auth', loginRouter);
    });

    test('payload OR 1=1 est traite comme string litterale, pas comme SQL', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/auth/login')
        .send({ username: "' OR '1'='1' --", password: 'anything' })
        .expect(401);

      // PREUVE : La requete utilise $1, pas d'interpolation
      const executedQuery = mockPool.query.mock.calls[0][0];
      const params = mockPool.query.mock.calls[0][1];
      expect(executedQuery).toContain('$1');
      expect(executedQuery).not.toContain("OR '1'='1'");
      expect(params[0]).toBe("' OR '1'='1' --");
    });

    test('payload UNION SELECT est traite comme string litterale', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/auth/login')
        .send({
          username: "' UNION SELECT * FROM users --",
          password: 'x'
        })
        .expect(401);

      const executedQuery = mockPool.query.mock.calls[0][0];
      expect(executedQuery).not.toContain('UNION');
    });

    test('payload DROP TABLE est traite comme string litterale', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/auth/login')
        .send({ username: "'; DROP TABLE users; --", password: 'x' });

      const executedQuery = mockPool.query.mock.calls[0][0];
      expect(executedQuery).not.toContain('DROP TABLE');
    });
  });
});
