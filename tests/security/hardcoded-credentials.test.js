const fs = require('fs');
const path = require('path');

describe('VULNERABILITE: Credentials hardcodees dans database.js', () => {

  const databaseFilePath = path.join(__dirname, '../../src/config/database.js');
  let sourceCode;

  beforeAll(() => {
    sourceCode = fs.readFileSync(databaseFilePath, 'utf8');
  });

  // ============================================================
  // Tests d'analyse statique du code source
  // ============================================================

  test('SECURE: pas de mot de passe en dur dans le code source', () => {
    expect(sourceCode).not.toContain('Admin123!');
    // Verifie qu'il n'y a pas de password hardcode (pattern: password: 'xxx')
    expect(sourceCode).not.toMatch(/password:\s*['"][A-Za-z0-9!@#$%]+['"]/);
  });

  test('SECURE: pas de username "root" en dur', () => {
    expect(sourceCode).not.toMatch(/user:\s*['"]root['"]/);
  });

  test('SECURE: utilise process.env pour la configuration', () => {
    expect(sourceCode).toContain('process.env.');
    expect(sourceCode).toMatch(/process\.env\.DB_PASSWORD/);
    expect(sourceCode).toMatch(/process\.env\.DB_USER/);
    expect(sourceCode).toMatch(/process\.env\.DB_NAME/);
  });

  test('SECURE: localhost n\'apparait que comme fallback (avec ||)', () => {
    const localhostMatches = sourceCode.match(/['"]localhost['"]/g);
    if (localhostMatches) {
      // Si localhost est present, il doit etre un fallback apres ||
      expect(sourceCode).toMatch(/process\.env\.\w+\s*\|\|\s*['"]localhost['"]/);
    }
  });
});
