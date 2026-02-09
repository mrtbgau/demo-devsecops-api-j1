const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 🚨 ATTENTION : Ce fichier contient des vulnérabilités à des fins pédagogiques

router.get('/files', (req, res) => {
  const filename = req.query.name;
  // Utilisation de concaténation simple (vulnérable) au lieu de path.join() qui normalise
  const uploadsDir = path.join(__dirname, '../../uploads');
  const filepath = `${uploadsDir}/${filename}`;

  try {
    const content = fs.readFileSync(filepath);
    res.send(content);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;
