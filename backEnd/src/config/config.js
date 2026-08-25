const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET are required in production');
}

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'development-only-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'development-only-refresh-secret',
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
