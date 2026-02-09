const express = require('express');
const request = require('supertest');
const { createMockPool } = require('../helpers/mockPool');

describe('VULNERABILITE: SQL Injection dans POST /api/users', () => {

  // ============================================================
  // VERSION INSECURE - Demontre la vulnerabilite
  // ============================================================
  describe('VERSION INSECURE - injection SQL via email, password et role', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      app = express();
      app.use(express.json());

      // Reproduction du code VULNERABLE original
      app.post('/api/users', async (req, res) => {
        try {
          const { email, password, role } = req.body;
          const query = `INSERT INTO users (username, email, password, role)
                         VALUES ('${email}', '${email}', '${password}', '${role}')`;
          await mockPool.query(query);
          res.json({ success: true });
        } catch (err) {
          res.status(500).json({ error: err.message, stack: err.stack });
        }
      });
    });

    test('injection SQL via le champ role avec DROP TABLE', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({
          email: 'test@test.com',
          password: 'password',
          role: "admin'); DROP TABLE users; --"
        });

      const executedQuery = mockPool.query.mock.calls[0][0];
      expect(executedQuery).toContain('DROP TABLE users');
    });

    test('injection SQL via le champ email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({
          email: "test@test.com', 'test@test.com', 'pass', 'admin'); --",
          password: 'password',
          role: 'user'
        });

      const executedQuery = mockPool.query.mock.calls[0][0];
      // PREUVE : Le payload est integre directement dans la requete SQL
      expect(executedQuery).toContain("'admin'");
      expect(executedQuery).toContain('--');
    });

    test('injection SQL via le champ password', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({
          email: 'test@test.com',
          password: "pass'); DELETE FROM users WHERE '1'='1",
          role: 'user'
        });

      const executedQuery = mockPool.query.mock.calls[0][0];
      expect(executedQuery).toContain('DELETE FROM users');
    });
  });

  // ============================================================
  // VERSION SECURE - Requetes parametrees bloquent l'injection
  // ============================================================
  describe('VERSION SECURE - requetes parametrees empechent l\'injection', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createUsersRouter = require('../../src/api/users');
      const usersRouter = createUsersRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api', usersRouter);
    });

    test('payload DROP TABLE dans role est parametree, pas interpretee', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({
          email: 'test@test.com',
          password: 'SecurePass1!',
          role: "admin'); DROP TABLE users; --"
        });

      // Meme si le test passe avec 201 ou 400 (validation), la requete est securisee
      if (mockPool.query.mock.calls.length > 0) {
        const executedQuery = mockPool.query.mock.calls[0][0];
        expect(executedQuery).toContain('$1');
        expect(executedQuery).not.toContain('DROP TABLE');
      }
    });

    test('payload d\'injection dans email est parametree', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/users')
        .send({
          email: "hack@test.com'; DROP TABLE users; --",
          password: 'SecurePass1!',
          role: 'user'
        });

      // La validation d'email devrait rejeter ce payload
      expect(response.status).toBe(400);
    });

    test('payload d\'injection dans password est parametree', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({
          email: 'test@test.com',
          password: "pass'); DELETE FROM users WHERE '1'='1",
        });

      if (mockPool.query.mock.calls.length > 0) {
        const executedQuery = mockPool.query.mock.calls[0][0];
        expect(executedQuery).not.toContain('DELETE FROM users');
      }
    });
  });
});
