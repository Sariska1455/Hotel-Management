const { Pool } = require('pg');

// We use a connection pool because opening a new database connection is an expensive operation.
// A pool maintains a set of active connections that can be reused for multiple queries.
// This significantly improves performance under load and prevents the database from being 
// overwhelmed by too many simultaneous connections.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Export the pool so it can be used across the application to execute queries
module.exports = pool;
