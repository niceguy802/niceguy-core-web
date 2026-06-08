import { Injectable, Inject, Optional, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import * as path from "path";
import { NEST_CLIENT_OPTIONS } from "../../logger";
import { NestClientOptions, DatabaseConnectionConfig } from "../../config";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  public clients: Record<string, any> = {};

  constructor(@Optional() @Inject(NEST_CLIENT_OPTIONS) private options?: NestClientOptions) {}

  async onModuleInit() {
    const dbConfig = this.options?.Dbs;
    if (!dbConfig || Object.keys(dbConfig).length === 0) return;

    for (const key of Object.keys(dbConfig)) {
      const cfg = dbConfig[key] as DatabaseConnectionConfig;
      if (!cfg) continue;

      let PrismaClientClass: any;
      const projectPrismaPath = path.join(process.cwd(), "prisma", "generated", key);
      try {
        const mod = require(projectPrismaPath);
        PrismaClientClass = mod.PrismaClient;
      } catch (_) {
        continue;
      }

      const url = this.buildDatabaseUrl(cfg);
      const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
      const adapter = new PrismaMariaDb({ connectionString: url });

      this.clients[key] = new PrismaClientClass({
        adapter,
      });

      await this.clients[key].$connect();
    }
  }

  async onModuleDestroy() {
    for (const key of Object.keys(this.clients)) {
      if (this.clients[key]) {
        await this.clients[key].$disconnect();
      }
    }
  }

  private buildDatabaseUrl(config: DatabaseConnectionConfig): string {
    const { type, user, password, host, port, database, connectionLimit = 5, socketTimeout = 30000, connectTimeout = 30000 } = config;
    return `${type}://${user}:${password}@${host}:${port}/${database}?connect_limit=${connectionLimit}&socket_timeout=${socketTimeout}&connect_timeout=${connectTimeout}`;
  }

  getClient(name = "fx"): any {
    const client = this.clients[name];
    if (!client) throw new Error(`Database client "${name}" not initialized`);
    return client;
  }
}
