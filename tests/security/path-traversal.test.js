const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const request = require('supertest');

describe('VULNERABILITE: Path Traversal dans GET /api/files', () => {

  let tmpUploadsDir;
  let secretFilePath;

  beforeAll(() => {
    // Creer un dossier uploads temporaire pour les tests
    tmpUploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-test-'));
    fs.writeFileSync(path.join(tmpUploadsDir, 'photo.jpg'), 'fake image content');

    // Creer un fichier "secret" EN DEHORS du dossier uploads
    secretFilePath = path.join(tmpUploadsDir, '..', 'secret-test-file.txt');
    fs.writeFileSync(secretFilePath, 'TOP SECRET DATA');
  });

  afterAll(() => {
    fs.rmSync(tmpUploadsDir, { recursive: true, force: true });
    if (fs.existsSync(secretFilePath)) {
      fs.unlinkSync(secretFilePath);
    }
  });

  // ============================================================
  // VERSION INSECURE - Demontre la vulnerabilite
  // ============================================================
  describe('VERSION INSECURE - concatenation permet le path traversal', () => {

    let app;

    beforeEach(() => {
      app = express();
      // Reproduction du code VULNERABLE original
      app.get('/api/files', (req, res) => {
        const filename = req.query.name;
        const filepath = `${tmpUploadsDir}/${filename}`;
        try {
          const content = fs.readFileSync(filepath, 'utf8');
          res.send(content);
        } catch (err) {
          res.status(404).json({ error: 'File not found' });
        }
      });
    });

    test('acces legitime a un fichier fonctionne', async () => {
      const response = await request(app)
        .get('/api/files?name=photo.jpg')
        .expect(200);
      expect(response.text).toBe('fake image content');
    });

    test('../ permet de lire un fichier hors du dossier uploads', async () => {
      const response = await request(app)
        .get('/api/files?name=../secret-test-file.txt')
        .expect(200);

      // PREUVE : On a lu un fichier qui devrait etre inaccessible
      expect(response.text).toBe('TOP SECRET DATA');
    });
  });

  // ============================================================
  // VERSION SECURE - path.resolve + startsWith bloquent le traversal
  // ============================================================
  describe('VERSION SECURE - validation du chemin empeche le traversal', () => {

    let app;

    beforeEach(() => {
      const createFilesRouter = require('../../src/api/files');
      const filesRouter = createFilesRouter(tmpUploadsDir);
      app = express();
      app.use('/api', filesRouter);
    });

    test('acces legitime a un fichier fonctionne toujours', async () => {
      const response = await request(app)
        .get('/api/files?name=photo.jpg')
        .expect(200);
      expect(Buffer.from(response.body).toString()).toBe('fake image content');
    });

    test('../traversal est bloque avec 403', async () => {
      await request(app)
        .get('/api/files?name=../secret-test-file.txt')
        .expect(403);
    });

    test('traversal profond ../../.. est bloque', async () => {
      await request(app)
        .get('/api/files?name=../../../../../../etc/passwd')
        .expect(403);
    });

    test('parametre name manquant retourne 400', async () => {
      await request(app)
        .get('/api/files')
        .expect(400);
    });
  });
});
