// NestClient 模块配置接口
import { LoggingConfig } from './default.config';

export interface DatabaseConnectionConfig {
  type: 'mysql' | 'mariadb';
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  socketTimeout?: number;
  poolTimeout?: number;
  connectTimeout?: number;
}

export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  connectTimeout?: number;
}

export interface AuthConfig {
  whiteList?: string[];
  allowDevice?: string[];
}

export interface FileLimitConfig {
  whiteList?: string[];
  size?: number; // MB
}

export interface JwtConfig {
  accessToken?: number;  // ms
  refreshToken?: number; // ms
  secret?: string;
}

export interface NestClientOptions {
  isGlobal?: boolean;
  keys?: string;
  isPwdEncrypt?: boolean;
  jwt?: JwtConfig;
  websocket?: { enable?: boolean };
  Dbs?: Record<string, DatabaseConnectionConfig>;
  redis?: Record<string, RedisConnectionConfig>;
  logging?: LoggingConfig;
  auth?: AuthConfig;
  fileLimit?: FileLimitConfig;
}
