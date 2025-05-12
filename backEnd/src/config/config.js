module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    // Use string format that jwt library understands directly
    expiresIn: '24h',  // Changed from 1h to 24h for testing
    refreshExpiresIn: '7d'
  },
  schema: 'finance', // PostgreSQL schema name
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};
