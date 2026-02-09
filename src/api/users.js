const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 🚨 ATTENTION : Ce fichier est le "CHALLENGE" du cours
// 🚨 Objectif : trouver TOUTES les vulnérabilités !

router.post('/users', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const query = `INSERT INTO users (username, email, password, role)
                   VALUES ('${email}', '${email}', '${password}', '${role}')`;

    await pool.query(query);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;
