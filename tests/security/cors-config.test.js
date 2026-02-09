const request = require('supertest');

describe('VULNERABILITE: Configuration CORS non restreinte', () => {

  // ============================================================
  // VERSION INSECURE - CORS ouvert a toutes les origines
  // ============================================================
  describe('VERSION INSECURE - cors() sans restriction', () => {

    let app;

    beforeEach(() => {
      const express = require('express');
      const cors = require('cors');
      app = express();
      // VULNERABLE : Aucune restriction d'origine
      app.use(cors());
      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
      });
    });

    test('une origine malveillante recoit Access-Control-Allow-Origin: *', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil-site.com');

      // PREUVE : Le serveur autorise TOUTES les origines
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  // ============================================================
  // VERSION SECURE - CORS restreint a une origine specifique
  // ============================================================
  describe('VERSION SECURE - CORS limite aux origines autorisees', () => {

    let app;

    beforeEach(() => {
      const express = require('express');
      const cors = require('cors');
      app = express();
      // SECURE : Seule l'origine configuree est autorisee
      app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
      });
    });

    test('une origine non autorisee ne recoit pas le header CORS', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil-site.com');

      const allowOrigin = response.headers['access-control-allow-origin'];
      // PREUVE : L'origine malveillante n'est pas autorisee
      expect(allowOrigin).not.toBe('*');
      expect(allowOrigin).not.toBe('https://evil-site.com');
    });

    test('l\'origine autorisee recoit le header CORS correct', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });
});
