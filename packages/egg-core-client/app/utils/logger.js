const pino = require("pino");
const path = require("path");
const fs = require("fs");
const { loggingConfig } = require("../../config/logging");

// ── 日志级别权重 ─────────────────────────────────────
const levelRank = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

// ── Time format: YYYY-MM-DD HH:mm:ss ────────────────
function formatTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

// ── Date-rotating file writer ───────────────────────
// Creates: {basePath}/YYYY-MM/DD.log
// Content: YYYY-MM-DD HH:mm:ss: message
class DateRotateWriter {
  constructor(basePath) {
    this.basePath = basePath;
    this.currentDate = "";
    this.stream = null;
  }

  _rotate() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
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
    this.stream = fs.createWriteStream(path.join(dir, `${day}.log`), {
      flags: "a",
    });
    this.stream.on("error", () => {
      // silent — prevent crash on file write errors
    });
    this.currentDate = dateStr;
  }

  write(line) {
    try {
      this._rotate();
      if (this.stream) {
        this.stream.write(line + "\n");
      }
    } catch (_) {
      // silent — don't crash the app over log write failures
    }
  }

  close() {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}

// ── Serialize extra data for plain-text file output ──
function flatData(data) {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return ` ${data}`;
  if (data instanceof Error) {
    return ` ${data.message}${data.stack ? `\n${data.stack}` : ""}`;
  }
  return ` ${JSON.stringify(data)}`;
}

// ── Console-only logger factory ──────────────────────
// 只在终端美化输出，不写入文件。用于初始化提示、状态消息等全局场景。
function createConsoleLogger(config) {
  const level = config.level || "info";
  const p = pino({
    level,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  });

  const logger = {};

  const stdLevels = ["trace", "debug", "info", "warn", "error", "fatal"];
  for (const lvl of stdLevels) {
    logger[lvl] = (message, data) => {
      if (data !== undefined && data !== null) {
        p[lvl](data, message);
      } else {
        p[lvl](message);
      }
    };
  }

  // 终端专用美化方法（不落文件）
  logger.success = (message) => p.info(`√ ${message}`);
  logger.init = (message) => p.info(`◆ ${message}`);
  logger.warning = logger.warn;

  return logger;
}

// ── File-logger factory (with optional terminal) ────
// 根据 config.terminal 决定是否同时在终端输出；根据 config.pretty 决定终端是否美化。
// 日志文件始终通过 DateRotateWriter 写入（当 filePath 非空时），但受 config.level 过滤。
function createLogger(config) {
  const level = config.level || "info";
  const minRank = levelRank[level] || levelRank.info;

  // 终端输出 (pino + 可选 pino-pretty)，仅在 config.terminal 为 true 时创建
  let p = null;
  if (config.terminal) {
    const pinoOpts = { level };
    if (config.pretty) {
      pinoOpts.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      };
    }
    p = pino(pinoOpts);
  }

  // 文件写入器（始终创建，当 filePath 非空时）
  const fw = config.filePath ? new DateRotateWriter(config.filePath) : null;

  const logger = {};

  const stdLevels = ["trace", "debug", "info", "warn", "error", "fatal"];
  for (const lvl of stdLevels) {
    logger[lvl] = (message, data) => {
      // 终端输出：pino 内部自带 level 过滤
      if (p) {
        if (data !== undefined && data !== null) {
          p[lvl](data, message);
        } else {
          p[lvl](message);
        }
      }
      // 文件写入：手动检查 level 权重，低于配置级别的不落文件
      if (fw && (levelRank[lvl] || 0) >= minRank) {
        fw.write(`${formatTime()}: [${lvl.toUpperCase()}] ${message}${flatData(data)}`);
      }
    };
  }

  // success / init 按 info 级别处理，受 config.level 过滤
  logger.success = (message) => {
    if (p) p.info(`√ ${message}`);
    if (fw && levelRank.info >= minRank) fw.write(`${formatTime()}: [SUCCESS] ${message}`);
  };
  logger.init = (message) => {
    if (p) p.info(`◆ ${message}`);
    if (fw && levelRank.info >= minRank) fw.write(`${formatTime()}: [INIT] ${message}`);
  };
  logger.warning = logger.warn;

  return logger;
}

// ── Pre-configured loggers ───────────────────────────

// consoleLogger：纯终端输出，不落文件。作为默认导出，供 index.js 初始化提示、全局状态消息等场景。
const consoleLogger = createConsoleLogger(loggingConfig.console);

// appLogger / requestLogger / prismaLogger：文件存储为主，终端输出由配置控制
const appLogger = createLogger(loggingConfig.app);
const requestLogger = createLogger(loggingConfig.request);
const prismaLogger = createLogger({
  level: loggingConfig.prisma.sqlLogLevel,
  filePath: loggingConfig.prisma.filePath,
  terminal: loggingConfig.prisma.sqlTerminal,
  pretty: loggingConfig.prisma.sqlTerminal,
});

// 默认导出：纯终端美化输出，用于初始化等全局消息
module.exports = consoleLogger;
module.exports.createLogger = createLogger;
module.exports.createConsoleLogger = createConsoleLogger;
module.exports.requestLogger = requestLogger;
module.exports.prismaLogger = prismaLogger;
module.exports.appLogger = appLogger;
