const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  // Créer quelques fichiers de test
  fs.writeFileSync(path.join(uploadsDir, 'photo.jpg'), 'fake image content');
  fs.writeFileSync(path.join(uploadsDir, 'document.pdf'), 'fake pdf content');
}

// Routes
const loginRouter = require('./auth/login');
const filesRouter = require('./api/files');
const usersRouter = require('./api/users');

// Page d'accueil
app.get('/', (req, res) => {
  res.json({
    message: 'API DevSecOps - Exercice Jour 1',
    warning: '🚨 Cette API contient des vulnérabilités à des fins pédagogiques',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Authentification',
        example: {
          username: 'admin',
          password: 'password123'
        }
      },
      {
        method: 'GET',
        path: '/api/files?name=photo.jpg',
        description: 'Téléchargement de fichiers',
        example: '/api/files?name=photo.jpg'
      },
      {
        method: 'POST',
        path: '/api/users',
        description: 'Création d\'utilisateur (CHALLENGE)',
        example: {
          email: 'user@example.com',
          password: 'mypassword',
          role: 'user'
        }
      },
      {
        method: 'GET',
        path: '/api/health',
        description: 'Health check',
        example: '/api/health'
      }
    ],
    exercises: [
      '1. Analyser le code de /api/auth/login et trouver les vulnérabilités',
      '2. Analyser le code de /api/files et trouver les vulnérabilités',
      '3. Analyser le code de /api/users et trouver TOUTES les vulnérabilités (CHALLENGE)',
      '4. Configurer git-secrets pour bloquer les commits de secrets'
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Monter les routes
app.use('/api/auth', loginRouter);
app.use('/api', filesRouter);
app.use('/api', usersRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack);
  // 🚨 Attention : en production, ne jamais exposer le stack trace !
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🚨 API DevSecOps - Exercice Jour 1                          ║
║                                                                ║
║   Serveur démarré sur : http://localhost:${PORT}                 ║
║                                                                ║
║   ⚠️  ATTENTION : Cette API contient des vulnérabilités       ║
║       à des fins pédagogiques. NE PAS utiliser en production! ║
║                                                                ║
║   📚 Endpoints disponibles :                                  ║
║      GET  /                    - Documentation               ║
║      POST /api/auth/login       - Login (SQL Injection)      ║
║      GET  /api/files?name=...   - Files (Path Traversal)     ║
║      POST /api/users            - Users (Challenge)          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
