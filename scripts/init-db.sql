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

-- SECURE : Mots de passe hashes avec bcrypt (salt 10) au lieu de plaintext
-- admin => Admin123!Secure | user => User123!Secure | alice => Alice123!Secure
INSERT INTO users (username, password, email, role) VALUES
    ('admin', '$2b$10$04guibzjzvHjgxEMUvsOzeVuY6IDSh97Aig1.qZbUtng/BVE45oue', 'admin@example.com', 'admin'),
    ('user', '$2b$10$kyBzhZd1YLQqfY9S9pdNzuY1xcFsRrBOVoaQuQS8a1JEMqv1DDTrK', 'user@example.com', 'user'),
    ('alice', '$2b$10$/5wNWNikxdgaQ/nFBv.ppeb9YnmHM2JDG0n2V4fW7EHy5QaJW//Qy', 'alice@example.com', 'user')
ON CONFLICT (username) DO NOTHING;

-- Afficher les utilisateurs créés
SELECT id, username, email, role FROM users;
