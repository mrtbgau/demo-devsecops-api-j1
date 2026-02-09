const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const authenticate = require('../../src/middlewares/authenticate');
const authorize = require('../../src/middlewares/authorize');

describe('VULNERABILITE: Middleware d\'authentification et d\'autorisation manquants', () => {

  // ============================================================
  // Tests du middleware authenticate
  // ============================================================
  describe('authenticate - verifie le token JWT', () => {

    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Route protegee par le middleware authenticate
      app.get('/api/protected', authenticate, (req, res) => {
        res.json({ success: true, user: req.user });
      });
    });

    test('requete sans header Authorization est rejetee avec 401', async () => {
      await request(app)
        .get('/api/protected')
        .expect(401);
    });

    test('requete avec token invalide est rejetee avec 401', async () => {
      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });

    test('requete avec token valide passe le middleware', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin', role: 'admin' },
        process.env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('admin');
    });

    test('token expire est rejete avec 401', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Attendre une seconde pour que le token soit expire
      await new Promise(resolve => setTimeout(resolve, 1000));

      await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    test('header Authorization sans "Bearer " est rejete', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin', role: 'admin' },
        process.env.JWT_SECRET
      );

      await request(app)
        .get('/api/protected')
        .set('Authorization', token)
        .expect(401);
    });
  });

  // ============================================================
  // Tests du middleware authorize
  // ============================================================
  describe('authorize - verifie les roles (RBAC)', () => {

    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Route admin-only : authenticate + authorize('admin')
      app.get('/api/admin', authenticate, authorize('admin'), (req, res) => {
        res.json({ success: true, message: 'Admin access granted' });
      });

      // Route user ou admin : authenticate + authorize('user', 'admin')
      app.get('/api/dashboard', authenticate, authorize('user', 'admin'), (req, res) => {
        res.json({ success: true, message: 'Dashboard access granted' });
      });
    });

    test('utilisateur avec role "user" ne peut pas acceder a la route admin', async () => {
      const token = jwt.sign(
        { id: 2, username: 'user', role: 'user' },
        process.env.JWT_SECRET
      );

      await request(app)
        .get('/api/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    test('utilisateur avec role "admin" peut acceder a la route admin', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin', role: 'admin' },
        process.env.JWT_SECRET
      );

      await request(app)
        .get('/api/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    test('utilisateur avec role "user" peut acceder au dashboard', async () => {
      const token = jwt.sign(
        { id: 2, username: 'user', role: 'user' },
        process.env.JWT_SECRET
      );

      await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
