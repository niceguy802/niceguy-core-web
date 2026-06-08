import { Injectable, Inject, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { NEST_CLIENT_OPTIONS } from '../../logger';
import { NestClientOptions, RedisConnectionConfig } from '../../config';

@Injectable()
export class RedisService {
  public clients: Record<string, Redis> = {};

  constructor(@Optional() @Inject(NEST_CLIENT_OPTIONS) private options?: NestClientOptions) {
    const redisConfig = options?.redis;
    if (!redisConfig || Object.keys(redisConfig).length === 0) return;

    for (const name of Object.keys(redisConfig)) {
      const cfg = redisConfig[name];
      if (!cfg) continue;

      const client = new Redis({
        host: cfg.host,
        port: cfg.port,
        password: cfg.password,
        db: cfg.db,
        lazyConnect: true,
        maxRetriesPerRequest: cfg.maxRetriesPerRequest || 3,
        enableOfflineQueue: false,
        connectTimeout: cfg.connectTimeout || 10000,
        retryStrategy(times: number) {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
        reconnectOnError(err: Error) {
          if (err.message.includes("READONLY")) return true;
          return false;
        },
      });

      this.clients[name] = client;
    }
  }

  async onModuleInit() {
    for (const name of Object.keys(this.clients)) {
      if (this.clients[name]) {
        await this.clients[name].connect();
      }
    }
  }

  async onModuleDestroy() {
    for (const name of Object.keys(this.clients)) {
      if (this.clients[name]) {
        await this.clients[name].quit();
      }
    }
  }

  getClient(name = "fx"): Redis {
    const client = this.clients[name];
    if (!client) throw new Error(`Redis client "${name}" not initialized`);
    return client;
  }
}
