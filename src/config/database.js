require('dotenv').config();
const { Pool } = require('pg');

// SECURE : Les credentials sont lues depuis les variables d'environnement
// Plus aucun mot de passe en dur dans le code source
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

module.exports = pool;
