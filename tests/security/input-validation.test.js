const express = require('express');
const request = require('supertest');
const { createMockPool } = require('../helpers/mockPool');

describe('VULNERABILITE: Absence de validation des inputs', () => {

  // ============================================================
  // VERSION INSECURE - Aucune validation
  // ============================================================
  describe('VERSION INSECURE - login accepte tout sans validation', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      app = express();
      app.use(express.json());

      // Reproduction du code VULNERABLE original
      app.post('/api/auth/login', async (req, res) => {
        const { username, password } = req.body;
        const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
        const result = await mockPool.query(query);
        if (result.rows.length > 0) {
          res.json({ success: true });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });
    });

    test('body vide est accepte sans erreur 400', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      // PREUVE : Le serveur ne valide pas les inputs, il execute la requete
      // avec undefined ce qui genere du SQL invalide mais pas d'erreur 400
      expect(response.status).not.toBe(400);
    });
  });

  describe('VERSION INSECURE - users accepte n\'importe quel email/password', () => {

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
          res.status(500).json({ error: err.message });
        }
      });
    });

    test('un email invalide est accepte', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/users')
        .send({ email: 'not-an-email', password: 'x', role: 'user' });

      // PREUVE : Pas de validation, le serveur accepte l'email invalide
      expect(response.status).toBe(200);
    });

    test('un mot de passe d\'un seul caractere est accepte', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/users')
        .send({ email: 'test@test.com', password: 'x', role: 'user' });

      expect(response.status).toBe(200);
    });
  });

  // ============================================================
  // VERSION SECURE - Validation stricte des inputs
  // ============================================================
  describe('VERSION SECURE - Login valide username et password', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createLoginRouter = require('../../src/auth/login');
      const loginRouter = createLoginRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api/auth', loginRouter);
    });

    test('body vide retourne 400', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });

    test('username manquant retourne 400', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ password: 'test' })
        .expect(400);
    });

    test('password manquant retourne 400', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' })
        .expect(400);
    });
  });

  describe('VERSION SECURE - Users valide email et password', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createUsersRouter = require('../../src/api/users');
      const usersRouter = createUsersRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api', usersRouter);
    });

    test('email invalide retourne 400', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'not-an-email', password: 'SecurePass1!' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    test('mot de passe trop court (moins de 8 caracteres) retourne 400', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'test@test.com', password: 'short' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    test('email manquant retourne 400', async () => {
      await request(app)
        .post('/api/users')
        .send({ password: 'SecurePass1!' })
        .expect(400);
    });

    test('password manquant retourne 400', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'test@test.com' })
        .expect(400);
    });
  });

  describe('VERSION SECURE - Files valide le parametre name', () => {

    let app;

    beforeEach(() => {
      const path = require('path');
      const os = require('os');
      const fs = require('fs');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'files-test-'));
      const createFilesRouter = require('../../src/api/files');
      const filesRouter = createFilesRouter(tmpDir);
      app = express();
      app.use('/api', filesRouter);
    });

    test('parametre name manquant retourne 400', async () => {
      await request(app)
        .get('/api/files')
        .expect(400);
    });
  });
});
