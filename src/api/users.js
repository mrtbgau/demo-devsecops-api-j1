const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// Factory function : accepte le pool en parametre pour l'injection de dependance
function createUsersRouter(pool) {
  const router = express.Router();

  router.post('/users', [
    // SECURE : Validation des inputs avec express-validator
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
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
