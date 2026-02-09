const client = require('prom-client');

// OBSERVABILITE : Metriques Prometheus pour le monitoring des evenements critiques
const register = new client.Registry();

// Metriques par defaut de Node.js (CPU, memoire, event loop, GC, etc.)
client.collectDefaultMetrics({ register });

// --- Compteurs de login ---
const loginAttempts = new client.Counter({
  name: 'auth_login_attempts_total',
  help: 'Nombre total de tentatives de login',
  labelNames: ['status'],
  registers: [register]
});

const loginDuration = new client.Histogram({
  name: 'auth_login_duration_seconds',
  help: 'Duree des requetes de login en secondes',
  labelNames: ['status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register]
});

// --- Compteurs d'inscription ---
const registrationAttempts = new client.Counter({
  name: 'auth_registration_attempts_total',
  help: 'Nombre total de tentatives d\'inscription',
  labelNames: ['status'],
  registers: [register]
});

const registrationDuration = new client.Histogram({
  name: 'auth_registration_duration_seconds',
  help: 'Duree des requetes d\'inscription en secondes',
  labelNames: ['status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register]
});

// --- Compteurs de telechargement ---
const fileDownloads = new client.Counter({
  name: 'file_downloads_total',
  help: 'Nombre total de telechargements de fichiers',
  labelNames: ['status'],
  registers: [register]
});

const fileDownloadDuration = new client.Histogram({
  name: 'file_download_duration_seconds',
  help: 'Duree des requetes de telechargement en secondes',
  labelNames: ['status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register]
});

module.exports = {
  register,
  loginAttempts,
  loginDuration,
  registrationAttempts,
  registrationDuration,
  fileDownloads,
  fileDownloadDuration
};
