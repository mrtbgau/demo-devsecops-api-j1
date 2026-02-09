const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createMockPool } = require('../helpers/mockPool');

describe('VULNERABILITE: Mots de passe stockes en clair', () => {

  // ============================================================
  // VERSION INSECURE - Comparaison directe en plaintext
  // ============================================================
  describe('VERSION INSECURE - mots de passe compares en texte brut', () => {

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
          res.json({ success: true, user: result.rows[0] });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });
    });

    test('le mot de passe transite en clair dans la requete SQL', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'mySecretPassword' });

      const executedQuery = mockPool.query.mock.calls[0][0];
      // PREUVE : Le mot de passe est visible en clair dans la requete
      expect(executedQuery).toContain('mySecretPassword');
    });
  });

  // ============================================================
  // VERSION SECURE - bcrypt pour le hachage
  // ============================================================
  describe('VERSION SECURE - Login utilise bcrypt.compare', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createLoginRouter = require('../../src/auth/login');
      const loginRouter = createLoginRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api/auth', loginRouter);
    });

    test('login accepte un mot de passe correct (hash bcrypt)', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'admin', password: hashedPassword, role: 'admin' }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'correctPassword' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('login rejette un mot de passe incorrect meme si l\'utilisateur existe', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'admin', password: hashedPassword, role: 'admin' }]
      });

      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongPassword' })
        .expect(401);
    });

    test('le mot de passe n\'apparait pas dans la requete SQL', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'mySecretPassword' });

      const executedQuery = mockPool.query.mock.calls[0][0];
      // PREUVE : Le mot de passe n'est PAS dans la requete SQL
      expect(executedQuery).not.toContain('mySecretPassword');
    });
  });

  // ============================================================
  // Creation d'utilisateur - mot de passe hache avant stockage
  // ============================================================
  describe('VERSION SECURE - Creation utilisateur hache le mot de passe', () => {

    let app, mockPool;

    beforeEach(() => {
      mockPool = createMockPool();
      const createUsersRouter = require('../../src/api/users');
      const usersRouter = createUsersRouter(mockPool);
      app = express();
      app.use(express.json());
      app.use('/api', usersRouter);
    });

    test('le mot de passe stocke en DB est un hash bcrypt, pas le texte brut', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/users')
        .send({ email: 'test@test.com', password: 'SecurePass1!' })
        .expect(201);

      // Inspecter ce qui a ete envoye a la base de donnees
      const params = mockPool.query.mock.calls[0][1];
      const storedPassword = params[2]; // 3eme parametre = mot de passe

      // PREUVE : Le mot de passe stocke est un hash bcrypt
      expect(storedPassword).not.toBe('SecurePass1!');
      expect(storedPassword).toMatch(/^\$2[aby]?\$\d+\$/);
      // Verifier que le hash correspond bien au mot de passe original
      expect(await bcrypt.compare('SecurePass1!', storedPassword)).toBe(true);
    });
  });
});
