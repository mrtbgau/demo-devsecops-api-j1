-- Script d'initialisation de la base de données
-- 🚨 ATTENTION : Ce script contient des données vulnérables à des fins pédagogiques

-- Créer la table users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer des utilisateurs de test
INSERT INTO users (username, password, email, role) VALUES
    ('admin', 'admin123', 'admin@example.com', 'admin'),
    ('user', 'password', 'user@example.com', 'user'),
    ('alice', 'alice2024', 'alice@example.com', 'user')
ON CONFLICT (username) DO NOTHING;

-- Afficher les utilisateurs créés
SELECT id, username, email, role FROM users;
