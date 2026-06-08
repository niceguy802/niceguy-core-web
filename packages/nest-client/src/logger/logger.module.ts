import { Injectable, Inject, Optional } from '@nestjs/common';
import { createFullLogger, createConsoleLogger, LoggerInstance, DateRotateWriter } from './logger.service';
import { NestClientOptions } from '../config';

export const NEST_CLIENT_OPTIONS = 'NEST_CLIENT_OPTIONS';

@Injectable()
export class NestLoggerService {
  private appLogger!: LoggerInstance;
  private requestLogger!: LoggerInstance;
  private prismaLogger!: LoggerInstance;
  private consoleLogger!: LoggerInstance;

  constructor(@Optional() @Inject(NEST_CLIENT_OPTIONS) private options?: NestClientOptions) {
    const loggingConfig = (options?.logging || {}) as any;

    this.consoleLogger = createConsoleLogger({
      level: loggingConfig.console?.level || 'info',
      terminal: true,
      pretty: true,
    });

    this.appLogger = createFullLogger({
      level: loggingConfig.app?.level || 'warn',
      terminal: loggingConfig.app?.terminal || false,
      pretty: loggingConfig.app?.pretty !== false,
      filePath: loggingConfig.app?.filePath || './logs/app',
    });

    this.requestLogger = createFullLogger({
      level: loggingConfig.request?.level || 'warn',
      terminal: loggingConfig.request?.terminal || false,
      filePath: loggingConfig.request?.filePath || './logs/request',
    });

    const prismaCfg = loggingConfig.prisma || {};
    this.prismaLogger = createFullLogger({
      level: prismaCfg.sqlLogLevel || 'debug',
      terminal: prismaCfg.sqlTerminal !== false,
      pretty: prismaCfg.sqlTerminal !== false,
      filePath: prismaCfg.filePath || './logs/prisma',
    });
  }

  get console() { return this.consoleLogger; }
  get app() { return this.appLogger; }
  get request() { return this.requestLogger; }
  get prisma() { return this.prismaLogger; }

  info(message: string, data?: unknown) { this.consoleLogger.info(message, data); }
  warn(message: string, data?: unknown) { this.consoleLogger.warn(message, data); }
  error(message: string, data?: unknown) { this.consoleLogger.error(message, data); }
  success(message: string) { this.consoleLogger.success(message); }
  init(message: string) { this.consoleLogger.init(message); }
  debug(message: string, data?: unknown) { this.consoleLogger.debug(message, data); }
}
