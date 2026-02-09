const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// SECURE : helmet ajoute des headers de securite (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet());
// SECURE : CORS restreint a une origine specifique au lieu de tout autoriser
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Creer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, 'photo.jpg'), 'fake image content');
  fs.writeFileSync(path.join(uploadsDir, 'document.pdf'), 'fake pdf content');
}

// Routes - Factory functions avec injection de dependance
const pool = require('./config/database');
const createLoginRouter = require('./auth/login');
const createFilesRouter = require('./api/files');
const createUsersRouter = require('./api/users');

const loginRouter = createLoginRouter(pool);
const filesRouter = createFilesRouter(uploadsDir);
const usersRouter = createUsersRouter(pool);

// Page d'accueil
app.get('/', (req, res) => {
  res.json({
    message: 'API DevSecOps - Exercice Jour 1',
    warning: 'Cette API a ete securisee dans le cadre du cours DevSecOps',
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
        description: 'Telechargement de fichiers',
        example: '/api/files?name=photo.jpg'
      },
      {
        method: 'POST',
        path: '/api/users',
        description: 'Creation d\'utilisateur',
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
  // SECURE : Ne jamais exposer le stack trace en production
  res.status(500).json({
    error: 'Internal server error'
  });
});

// SECURE : Guard pour eviter de demarrer le serveur lors des tests
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

module.exports = app;
