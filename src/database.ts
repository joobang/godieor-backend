import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './generated/prisma/client';
import { runtimeConfig } from './config';
@Injectable()
export class Database extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  private readonly locks: Pool;
  constructor() {
    const { databaseUrl } = runtimeConfig();
    super({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 6 }) });
    this.locks = new Pool({ connectionString: databaseUrl, max: 2 });
  }
  async onModuleInit() { await this.$connect(); }
  async onApplicationShutdown() { await this.$disconnect(); await this.locks.end(); }
  async withCollectorLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    const client = await this.locks.connect(); let locked = false;
    try {
      const r = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked', ['godieor:' + key]);
      locked = r.rows[0]?.locked === true;
      return locked ? await fn() : null;
    } finally {
      try { if (locked) await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', ['godieor:' + key]); }
      finally { client.release(); }
    }
  }
}
