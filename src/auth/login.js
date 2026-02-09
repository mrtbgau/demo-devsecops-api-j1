const express = require('express');
const bcrypt = require('bcryptjs');

// Factory function : accepte le pool en parametre pour l'injection de dependance
function createLoginRouter(pool) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      // SECURE : Validation des inputs
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

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
      res.json({
        success: true,
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
