/**
 * Cree un mock de pg.Pool pour les tests unitaires.
 * Permet de tester les routes sans connexion reelle a PostgreSQL.
 *
 * Usage:
 *   const { createMockPool } = require('../helpers/mockPool');
 *   const mockPool = createMockPool();
 *   mockPool.query.mockResolvedValueOnce({ rows: [...], rowCount: 1 });
 */
function createMockPool() {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  };
}

module.exports = { createMockPool };
