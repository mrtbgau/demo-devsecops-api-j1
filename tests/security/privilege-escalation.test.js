const express = require('express');
const request = require('supertest');
const { createMockPool } = require('../helpers/mockPool');

describe('VULNERABILITE: Escalade de privileges dans POST /api/users', () => {

  // ============================================================
  // VERSION INSECURE - L'utilisateur peut choisir son propre role
  // ============================================================
  describe('VERSION INSECURE - le client peut definir role=admin', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      app = express();
      app.use(express.json());

      // Reproduction du code VULNERABLE original
      app.post('/api/users', async (req, res) => {
        const { email, password, role } = req.body;
        const query = `INSERT INTO users (username, email, password, role)
                       VALUES ('${email}', '${email}', '${password}', '${role}')`;
        await mockPool.query(query);
        res.json({ success: true });
      });
    });

    test('un utilisateur peut se creer un compte admin', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({ email: 'hacker@evil.com', password: 'password', role: 'admin' })
        .expect(200);

      const executedQuery = mockPool.query.mock.calls[0][0];
      // PREUVE : Le role "admin" fourni par l'utilisateur est insere directement
      expect(executedQuery).toContain("'admin'");
    });

    test('un utilisateur peut definir un role arbitraire (superadmin)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({ email: 'hacker@evil.com', password: 'password', role: 'superadmin' });

      const executedQuery = mockPool.query.mock.calls[0][0];
      expect(executedQuery).toContain("'superadmin'");
    });
  });

  // ============================================================
  // VERSION SECURE - Le role est toujours force a "user"
  // ============================================================
  describe('VERSION SECURE - le role est force a "user" cote serveur', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createUsersRouter = require('../../src/api/users');
      const usersRouter = createUsersRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api', usersRouter);
    });

    test('meme si role=admin est envoye, le role stocke est "user"', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({ email: 'hacker@evil.com', password: 'SecurePass1!', role: 'admin' })
        .expect(201);

      const params = mockPool.query.mock.calls[0][1];
      const storedRole = params[3]; // 4eme parametre = role
      // PREUVE : Le role est toujours "user", pas "admin"
      expect(storedRole).toBe('user');
    });

    test('sans role dans la requete, le defaut est "user"', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({ email: 'normal@user.com', password: 'SecurePass1!' })
        .expect(201);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[3]).toBe('user');
    });

    test('role "superadmin" est ignore et force a "user"', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({ email: 'hacker@evil.com', password: 'SecurePass1!', role: 'superadmin' })
        .expect(201);

      const params = mockPool.query.mock.calls[0][1];
      expect(params[3]).toBe('user');
    });
  });
});
