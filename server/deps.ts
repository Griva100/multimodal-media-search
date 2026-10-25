import pg from 'pg';
export type Deps = {pool: pg.Pool};
export function createDeps(config = {database: process.env.DATABASE_URL}): Deps {
  if (!config.database) throw new Error('DATABASE_URL is required');
  return {pool: new pg.Pool({connectionString: config.database, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000})};
}
export async function closeDeps(d: Deps) { await d.pool.end(); }
