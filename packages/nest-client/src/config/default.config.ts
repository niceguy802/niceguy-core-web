import * as path from 'path';

export interface LoggingLevelConfig {
  level: string;
  terminal?: boolean;
  pretty?: boolean;
  filePath?: string;
}

export interface LoggingConfig {
  console: LoggingLevelConfig & { pretty: boolean };
  request: LoggingLevelConfig;
  app: LoggingLevelConfig & { pretty: boolean };
  prisma: LoggingLevelConfig & {
    sqlTerminal: boolean;
    sqlLogLevel: string;
    slowQueryMs: number;
  };
}

export const defaultLoggingConfig: LoggingConfig = {
  console: {
    level: 'info',
    pretty: true,
  },
  request: {
    level: 'warn',
    terminal: false,
    filePath: path.join(process.cwd(), 'logs', 'request'),
  },
  app: {
    level: 'warn',
    pretty: true,
    terminal: false,
    filePath: path.join(process.cwd(), 'logs', 'app'),
  },
  prisma: {
    level: 'warn',
    sqlTerminal: true,
    sqlLogLevel: 'debug',
    slowQueryMs: 20000,
    filePath: path.join(process.cwd(), 'logs', 'prisma'),
  },
};

export const defaultNestClientConfig = {
  keys: 'niceguy_nest_client_key',
  isPwdEncrypt: true,
  jwt: {
    accessToken: 60 * 60 * 1000,          // 1 小时
    refreshToken: 60 * 60 * 24 * 7 * 1000, // 7 天
    secret: 'niceguy-core',
  },
  middleware: ['checkReady', 'errorHandler', 'requestLog', 'jwtAuth'],
  fileLimit: {
    whiteList: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.xlsx', '.xls', '.doc', '.docx'],
    size: 10, // MB
  },
  auth: {
    whiteList: ['/api/public'],
    allowDevice: ['pc', 'h5', 'app', 'miniapp'],
  },
};
