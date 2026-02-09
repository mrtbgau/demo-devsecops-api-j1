const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

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
    try {
      // SECURE : Verifier les erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // SECURE : Le role est TOUJOURS force a 'user' cote serveur
      // Avant (VULNERABLE) : const { role } = req.body; -- permettait l'escalade de privileges
      const role = 'user';

      // SECURE : Hachage bcrypt du mot de passe avant stockage
      const hashedPassword = await bcrypt.hash(password, 10);

      // SECURE : Requete parametree au lieu de string interpolation
      // Avant (VULNERABLE) : `INSERT INTO users ... VALUES ('${email}', '${email}', '${password}', '${role}')`
      const query = 'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)';
      await pool.query(query, [email, email, hashedPassword, role]);

      res.status(201).json({ success: true });
    } catch (err) {
      // SECURE : Pas de stack trace dans la reponse d'erreur
      // Avant (VULNERABLE) : res.status(500).json({ error: err.message, stack: err.stack })
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createUsersRouter;
