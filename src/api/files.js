const express = require('express');
const fs = require('fs');
const path = require('path');
const logger = require('../observability/logger');
const { fileDownloads, fileDownloadDuration } = require('../observability/metrics');
const { tracer } = require('../observability/tracing');

// Factory function : accepte le dossier uploads en parametre
function createFilesRouter(uploadsDir) {
  const router = express.Router();

  // Resoudre le chemin canonique une seule fois
  const resolvedUploadsDir = path.resolve(uploadsDir);

  router.get('/files', (req, res) => {
    const start = Date.now();
    // OBSERVABILITE (BONUS) : Creer un span de tracing pour cette requete de telechargement
    const span = tracer?.startSpan('file.download');
    const filename = req.query.name;

    span?.setAttribute('http.client_ip', req.ip);
    span?.setAttribute('user.id', req.user?.id);

    // SECURE : Validation que le parametre name est present
    if (!filename) {
      fileDownloads.inc({ status: 'failure' });
      fileDownloadDuration.observe({ status: 'failure' }, (Date.now() - start) / 1000);
      logger.warn('Echec de telechargement : nom de fichier manquant', {
        event: 'file_download_failure',
        reason: 'missing_filename',
        userId: req.user?.id,
        ip: req.ip
      });
      span?.setAttribute('download.outcome', 'failure');
      span?.setAttribute('download.reason', 'missing_filename');
      span?.end();
      return res.status(400).json({ error: 'Filename is required' });
    }

    span?.setAttribute('file.name', filename);

    // SECURE : Resoudre le chemin complet et verifier qu'il reste dans uploadsDir
    // Avant (VULNERABLE) : const filepath = `${uploadsDir}/${filename}`;
    const filepath = path.resolve(resolvedUploadsDir, filename);

    if (!filepath.startsWith(resolvedUploadsDir + path.sep) && filepath !== resolvedUploadsDir) {
      // OBSERVABILITE : Log + metrique pour tentative de path traversal (alerte securite)
      fileDownloads.inc({ status: 'denied' });
      fileDownloadDuration.observe({ status: 'denied' }, (Date.now() - start) / 1000);
      logger.warn('Telechargement refuse : tentative de path traversal', {
        event: 'file_download_denied',
        reason: 'path_traversal',
        filename,
        userId: req.user?.id,
        ip: req.ip
      });
      span?.setAttribute('download.outcome', 'denied');
      span?.setAttribute('download.reason', 'path_traversal');
      span?.end();
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const content = fs.readFileSync(filepath);

      // OBSERVABILITE : Log + metrique pour succes de telechargement
      fileDownloads.inc({ status: 'success' });
      fileDownloadDuration.observe({ status: 'success' }, (Date.now() - start) / 1000);
      logger.info('Telechargement reussi', {
        event: 'file_download_success',
        filename,
        userId: req.user?.id,
        ip: req.ip
      });
      span?.setAttribute('download.outcome', 'success');
      span?.end();

      res.send(content);
    } catch (err) {
      // OBSERVABILITE : Log + metrique pour fichier non trouve
      fileDownloads.inc({ status: 'failure' });
      fileDownloadDuration.observe({ status: 'failure' }, (Date.now() - start) / 1000);
      logger.warn('Echec de telechargement : fichier non trouve', {
        event: 'file_download_failure',
        reason: 'file_not_found',
        filename,
        userId: req.user?.id,
        ip: req.ip
      });
      span?.setAttribute('download.outcome', 'failure');
      span?.setAttribute('download.reason', 'file_not_found');
      span?.end();
      res.status(404).json({ error: 'File not found' });
    }
  });

  return router;
}

module.exports = createFilesRouter;
