// @ts-check
'use strict';

const path = require('path');
const { execSync } = require('child_process');

/** @type {() => Promise<void>} */
module.exports = async function globalSetup() {
  const { PostgreSqlContainer } = require('@testcontainers/postgresql');

  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const dbUrl = container.getConnectionUri();

  process.env.DATABASE_URL = dbUrl;
  process.env.DIRECT_URL = dbUrl;
  process.env.REDIS_URL = 'redis://test-mock';
  process.env.INTERNAL_API_SECRET = 'test-internal-secret';

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../../../../../packages/db'),
    env: { ...process.env },
    stdio: 'inherit',
  });

  // container is stored on global — accessible from globalTeardown (same jest main process)
  global.__PG_CONTAINER__ = container;
};
