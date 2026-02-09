const { Pool } = require('pg');

// 🚨 ATTENTION : Ce fichier contient des vulnérabilités à des fins pédagogiques

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'root',
  password: 'Admin123!',
  database: 'myapp'
});

module.exports = pool;
