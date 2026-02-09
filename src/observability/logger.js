const winston = require('winston');

// OBSERVABILITE : Logger structure pour l'ensemble de l'application
// Utilise le format JSON en production pour l'ingestion par des outils (ELK, Loki, etc.)
// Format lisible et colore en developpement
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.sssZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'devsecops-api' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
    })
  ]
});

// Desactiver les logs pendant les tests pour ne pas polluer la sortie Jest
if (process.env.NODE_ENV === 'test') {
  logger.silent = true;
}

module.exports = logger;
