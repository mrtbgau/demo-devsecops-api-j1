const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 🚨 ATTENTION : Ce fichier contient des vulnérabilités à des fins pédagogiques

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    const result = await pool.query(query);

    if (result.rows.length > 0) {
      res.json({
        success: true,
        token: result.rows[0].id,
        user: result.rows[0]
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
