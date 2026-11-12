import { createApp } from './app.js';
import { env } from './config/env.js';
import { createRepository } from './db/index.js';

async function main() {
  const repo = await createRepository();
  const app = createApp({ repo });

  const server = app.listen(env.PORT, () => {
    console.log(`FrameNew API running on http://localhost:${env.PORT} (db=${repo.driver})`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await repo.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
