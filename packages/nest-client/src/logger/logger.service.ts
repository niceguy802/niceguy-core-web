import pino from "pino";
import * as path from "path";
import * as fs from "fs";
import { LoggingLevelConfig } from "../config";

const levelRank: Record<string, number> = {
  trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60,
};

export class DateRotateWriter {
  private basePath: string;
  private currentDate = "";
  private stream: fs.WriteStream | null = null;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private rotate() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const yearMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const day = pad(now.getDate());
    const dateStr = `${yearMonth}-${day}`;

    if (dateStr === this.currentDate) return;

    if (this.stream) {
      this.stream.destroy();
      this.stream = null;
    }

    const dir = path.resolve(this.basePath, yearMonth);
    fs.mkdirSync(dir, { recursive: true });
    this.stream = fs.createWriteStream(path.join(dir, `${day}.log`), { flags: "a" });
    this.stream.on("error", () => {});
    this.currentDate = dateStr;
  }

  write(line: string) {
    try {
      this.rotate();
      if (this.stream) {
        this.stream.write(line + "\n");
      }
    } catch (_) {}
  }

  close() {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}

function flatData(data: unknown): string {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return ` ${data}`;
  if (data instanceof Error) return ` ${data.message}${data.stack ? `\n${data.stack}` : ""}`;
  return ` ${JSON.stringify(data)}`;
}

export interface LoggerInstance {
  trace: (msg: string, data?: unknown) => void;
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
  fatal: (msg: string, data?: unknown) => void;
  success: (msg: string) => void;
  init: (msg: string) => void;
  warning?: (msg: string, data?: unknown) => void;
}

export function createConsoleLogger(config: LoggingLevelConfig): LoggerInstance {
  const level = config.level || "info";
  const p = pino({
    level,
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "yyyy-mm-dd HH:MM:ss", ignore: "pid,hostname" },
    },
  });

  const logger: Record<string, Function> = {};
  const stdLevels = ["trace", "debug", "info", "warn", "error", "fatal"];
  for (const lvl of stdLevels) {
    logger[lvl] = (message: string, data?: unknown) => {
      if (data !== undefined && data !== null) (p as any)[lvl](data, message);
      else (p as any)[lvl](message);
    };
  }
  logger.success = (message: string) => p.info(`√ ${message}`);
  logger.init = (message: string) => p.info(`◆ ${message}`);

  return logger as unknown as LoggerInstance;
}

export function createFullLogger(config: LoggingLevelConfig): LoggerInstance {
  const level = config.level || "info";
  const minRank = levelRank[level] || levelRank.info;

  let p: pino.Logger | null = null;
  if (config.terminal) {
    const opts: pino.LoggerOptions = { level };
    if (config.pretty) {
      (opts as any).transport = {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "yyyy-mm-dd HH:MM:ss", ignore: "pid,hostname" },
      };
    }
    p = pino(opts);
  }

  const fw = config.filePath ? new DateRotateWriter(config.filePath) : null;

  const logger: Record<string, Function> = {};
  const stdLevels = ["trace", "debug", "info", "warn", "error", "fatal"];
  for (const lvl of stdLevels) {
    logger[lvl] = (message: string, data?: unknown) => {
      if (p) {
        if (data !== undefined && data !== null) (p as any)[lvl](data, message);
        else (p as any)[lvl](message);
      }
      if (fw && (levelRank[lvl] || 0) >= minRank) {
        fw.write(`${formatTime()}: [${lvl.toUpperCase()}] ${message}${flatData(data)}`);
      }
    };
  }

  logger.success = (message: string) => {
    if (p) p.info(`√ ${message}`);
    if (fw && levelRank.info >= minRank) fw.write(`${formatTime()}: [SUCCESS] ${message}`);
  };
  logger.init = (message: string) => {
    if (p) p.info(`◆ ${message}`);
    if (fw && levelRank.info >= minRank) fw.write(`${formatTime()}: [INIT] ${message}`);
  };
  logger.warning = logger.warn;

  return logger as unknown as LoggerInstance;
}

function formatTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
