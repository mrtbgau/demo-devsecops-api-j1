const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const logger = require('../observability/logger');
const { registrationAttempts, registrationDuration } = require('../observability/metrics');
const { tracer } = require('../observability/tracing');

// Factory function : accepte le pool en parametre pour l'injection de dependance
function createUsersRouter(pool) {
  const router = express.Router();

  // SECURE : Route protegee - profil de l'utilisateur connecte
  router.get('/users/me', authenticate, async (req, res) => {
    try {
      // SECURE : Requete parametree, ne retourne jamais le mot de passe
      const query = 'SELECT id, username, email, role, created_at FROM users WHERE id = $1';
      const result = await pool.query(query, [req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // SECURE : Route protegee admin uniquement - listing des utilisateurs
  router.get('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
      // SECURE : Ne jamais retourner les mots de passe
      const query = 'SELECT id, username, email, role, created_at FROM users';
      const result = await pool.query(query);

      res.json({ users: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/users', [
    // SECURE : Validation des inputs avec express-validator
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    // SECURE : Politique de mot de passe forte (majuscule, minuscule, chiffre, caractere special, min 12 chars)
    body('password').isStrongPassword({
      minLength: 12,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }).withMessage('Password must be at least 12 characters with uppercase, lowercase, number and special character')
  ], async (req, res) => {
    const start = Date.now();
    // OBSERVABILITE (BONUS) : Creer un span de tracing pour cette requete d'inscription
    const span = tracer?.startSpan('user.registration');

    try {
      // SECURE : Verifier les erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // OBSERVABILITE : Log + metrique pour echec d'inscription (validation)
        registrationAttempts.inc({ status: 'failure' });
        registrationDuration.observe({ status: 'failure' }, (Date.now() - start) / 1000);
        logger.warn('Echec d\'inscription : validation echouee', {
          event: 'registration_failure',
          reason: 'validation_error',
          ip: req.ip
        });
        span?.setAttribute('registration.outcome', 'failure');
        span?.setAttribute('registration.reason', 'validation_error');
        span?.end();
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      span?.setAttribute('user.email_prefix', email.substring(0, 3) + '***');
      span?.setAttribute('http.client_ip', req.ip);

      // SECURE : Le role est TOUJOURS force a 'user' cote serveur
      // Avant (VULNERABLE) : const { role } = req.body; -- permettait l'escalade de privileges
      const role = 'user';

      // SECURE : Hachage bcrypt du mot de passe avant stockage
      const hashedPassword = await bcrypt.hash(password, 10);

      // SECURE : Requete parametree au lieu de string interpolation
      // Avant (VULNERABLE) : `INSERT INTO users ... VALUES ('${email}', '${email}', '${password}', '${role}')`
      const query = 'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)';
      await pool.query(query, [email, email, hashedPassword, role]);

      // OBSERVABILITE : Log + metrique pour succes d'inscription
      registrationAttempts.inc({ status: 'success' });
      registrationDuration.observe({ status: 'success' }, (Date.now() - start) / 1000);
      logger.info('Inscription reussie', {
        event: 'registration_success',
        email: email.substring(0, 3) + '***',
        ip: req.ip
      });
      span?.setAttribute('registration.outcome', 'success');
      span?.end();

      res.status(201).json({ success: true });
    } catch (err) {
      // OBSERVABILITE : Log + metrique pour erreur interne
      registrationAttempts.inc({ status: 'failure' });
      registrationDuration.observe({ status: 'failure' }, (Date.now() - start) / 1000);
      logger.error('Erreur interne lors de l\'inscription', {
        event: 'registration_error',
        error: err.message,
        ip: req.ip
      });
      span?.recordException(err);
      span?.end();
      // SECURE : Pas de stack trace dans la reponse d'erreur
      // Avant (VULNERABLE) : res.status(500).json({ error: err.message, stack: err.stack })
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createUsersRouter;
