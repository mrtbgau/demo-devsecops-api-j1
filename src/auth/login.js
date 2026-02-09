const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const logger = require('../observability/logger');
const { loginAttempts, loginDuration } = require('../observability/metrics');
const { tracer } = require('../observability/tracing');

// Factory function : accepte le pool en parametre pour l'injection de dependance
function createLoginRouter(pool) {
  const router = express.Router();

  router.post('/login', [
    // SECURE : Validation stricte des inputs avec express-validator
    body('username').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Valid username is required'),
    body('password').isString().isLength({ min: 1, max: 255 }).withMessage('Valid password is required')
  ], async (req, res) => {
    const start = Date.now();
    // OBSERVABILITE (BONUS) : Creer un span de tracing pour cette requete de login
    const span = tracer?.startSpan('auth.login');

    try {
      // SECURE : Verifier les erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        loginAttempts.inc({ status: 'failure' });
        loginDuration.observe({ status: 'failure' }, (Date.now() - start) / 1000);
        logger.warn('Echec de login : validation echouee', {
          event: 'login_failure',
          reason: 'validation_error',
          ip: req.ip
        });
        span?.setAttribute('login.outcome', 'failure');
        span?.setAttribute('login.reason', 'validation_error');
        span?.end();
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const { username, password } = req.body;

      span?.setAttribute('user.username', username);
      span?.setAttribute('http.client_ip', req.ip);

      // SECURE : Requete parametree au lieu de string interpolation
      // Avant (VULNERABLE) : `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await pool.query(query, [username]);

      if (result.rows.length === 0) {
        // OBSERVABILITE : Log + metrique pour echec de login (utilisateur inconnu)
        loginAttempts.inc({ status: 'failure' });
        loginDuration.observe({ status: 'failure' }, (Date.now() - start) / 1000);
        logger.warn('Echec de login : utilisateur inconnu', {
          event: 'login_failure',
          username,
          reason: 'user_not_found',
          ip: req.ip
        });
        span?.setAttribute('login.outcome', 'failure');
        span?.setAttribute('login.reason', 'user_not_found');
        span?.end();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // SECURE : Comparaison bcrypt au lieu de plaintext
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        // OBSERVABILITE : Log + metrique pour echec de login (mauvais mot de passe)
        loginAttempts.inc({ status: 'failure' });
        loginDuration.observe({ status: 'failure' }, (Date.now() - start) / 1000);
        logger.warn('Echec de login : mot de passe incorrect', {
          event: 'login_failure',
          username,
          reason: 'invalid_password',
          ip: req.ip
        });
        span?.setAttribute('login.outcome', 'failure');
        span?.setAttribute('login.reason', 'invalid_password');
        span?.end();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // SECURE : Ne pas retourner le mot de passe dans la reponse
      const { password: _, ...safeUser } = user;

      // SECURE : Generer un JWT signe avec expiration
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // OBSERVABILITE : Log + metrique pour succes de login
      loginAttempts.inc({ status: 'success' });
      loginDuration.observe({ status: 'success' }, (Date.now() - start) / 1000);
      logger.info('Login reussi', {
        event: 'login_success',
        username,
        userId: user.id,
        role: user.role,
        ip: req.ip
      });
      span?.setAttribute('login.outcome', 'success');
      span?.setAttribute('user.id', user.id);
      span?.setAttribute('user.role', user.role);
      span?.end();

      res.json({
        success: true,
        token,
        user: safeUser
      });
    } catch (err) {
      // OBSERVABILITE : Log + metrique pour erreur interne
      loginAttempts.inc({ status: 'failure' });
      loginDuration.observe({ status: 'failure' }, (Date.now() - start) / 1000);
      logger.error('Erreur interne lors du login', {
        event: 'login_error',
        error: err.message,
        ip: req.ip
      });
      span?.recordException(err);
      span?.end();
      // SECURE : Message generique, pas de details internes
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createLoginRouter;
