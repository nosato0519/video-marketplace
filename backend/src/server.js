import { createApp } from './app.js';
import { closePool } from './db.js';
import { runMigrations } from '../scripts/migrate.js';

const port = Number(process.env.PORT || 3000);

async function start() {
  await runMigrations();

  const app = createApp();

  const server = app.listen(port, () => {
    console.log(`Video marketplace API listening on ${port}`);
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down gracefully`);

    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();

    try {
      await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      });
      await closePool();
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      console.error('Graceful shutdown failed', error);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

start().catch(error => {
  console.error('Database migration failed; server startup aborted', error);
  void closePool().finally(() => process.exit(1));
});
