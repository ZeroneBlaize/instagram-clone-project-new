import path from 'node:path';
import { env } from '../config/env.js';
import { MongoRepository } from './mongoStore.js';
import { DataRepository } from './repository.js';
import { seedDatabaseIfEmpty } from './seed.js';
import { SqliteRepository } from './sqliteStore.js';

export async function createRepository(override?: { sqlitePath?: string; mongoUri?: string }): Promise<DataRepository> {
  const mongoUri = override?.mongoUri ?? env.MONGODB_URI;
  const repo: DataRepository = mongoUri
    ? new MongoRepository(mongoUri)
    : new SqliteRepository(
        override?.sqlitePath ??
          (env.SQLITE_PATH || path.resolve(process.cwd(), 'data', 'framenew.db'))
      );

  await repo.init();
  await seedDatabaseIfEmpty(repo);
  return repo;
}
