const logger = require('./logger');

// OBSERVABILITE : Middleware Express pour logger chaque requete HTTP
// Mesure la duree et log le resultat (methode, path, status, duree, ip)
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    };

    if (res.statusCode >= 500) {
      logger.error('Requete terminee avec erreur serveur', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Requete terminee avec erreur client', logData);
    } else {
      logger.info('Requete terminee', logData);
    }
  });

  next();
}

module.exports = requestLogger;
