const express = require('express');
const fs = require('fs');
const path = require('path');

// Factory function : accepte le dossier uploads en parametre
function createFilesRouter(uploadsDir) {
  const router = express.Router();

  // Resoudre le chemin canonique une seule fois
  const resolvedUploadsDir = path.resolve(uploadsDir);

  router.get('/files', (req, res) => {
    const filename = req.query.name;

    // SECURE : Validation que le parametre name est present
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // SECURE : Resoudre le chemin complet et verifier qu'il reste dans uploadsDir
    // Avant (VULNERABLE) : const filepath = `${uploadsDir}/${filename}`;
    const filepath = path.resolve(resolvedUploadsDir, filename);

    if (!filepath.startsWith(resolvedUploadsDir + path.sep) && filepath !== resolvedUploadsDir) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const content = fs.readFileSync(filepath);
      res.send(content);
    } catch (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });

  return router;
}

module.exports = createFilesRouter;
