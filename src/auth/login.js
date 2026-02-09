const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Factory function : accepte le pool en parametre pour l'injection de dependance
function createLoginRouter(pool) {
  const router = express.Router();

  router.post('/login', [
    // SECURE : Validation stricte des inputs avec express-validator
    body('username').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Valid username is required'),
    body('password').isString().isLength({ min: 1, max: 255 }).withMessage('Valid password is required')
  ], async (req, res) => {
    try {
      // SECURE : Verifier les erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const { username, password } = req.body;

      // SECURE : Requete parametree au lieu de string interpolation
      // Avant (VULNERABLE) : `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await pool.query(query, [username]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // SECURE : Comparaison bcrypt au lieu de plaintext
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
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

      res.json({
        success: true,
        token,
        user: safeUser
      });
    } catch (err) {
      // SECURE : Message generique, pas de details internes
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createLoginRouter;
