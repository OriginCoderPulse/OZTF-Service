const fs = require("fs");
const path = require("path");

// 环境变量解析工具，支持 true/false/1/0/yes/no 等
const parseBool = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(v)) return true;
  if (["0", "false", "no", "n"].includes(v)) return false;
  return defaultValue;
};

// 是否写入日志文件：仅由 OUTPUT_LOG 决定（不区分环境）
const ENABLE_FILE_LOG = parseBool(process.env.OUTPUT_LOG, false);
// 是否在控制台输出：仅由 SHOW_TERMINAL_CONSOLE 决定（不区分环境）
const ENABLE_CONSOLE_LOG = parseBool(process.env.SHOW_TERMINAL_CONSOLE, true);

// 日志目录：项目根目录下 logs
const logDir = path.join(__dirname, "../../logs");

// 确保日志目录存在（仅当需要写文件时）
if (ENABLE_FILE_LOG && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 获取日志文件路径（按日期）
const getLogFilePath = () => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(logDir, `app-${today}.log`);
};

// 格式化日志消息
const formatLogMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const argsStr =
    args.length > 0
      ? " " +
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(" ")
      : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}\n`;
};

// 写入日志文件
const writeToFile = (message) => {
  if (!ENABLE_FILE_LOG) return;

  try {
    const logFile = getLogFilePath();
    fs.appendFileSync(logFile, message, "utf8");
  } catch (error) {
    // 如果写入失败，静默处理（避免影响主程序）
  }
};

// 创建日志对象
const logger = {
  log: (...args) => {
    const message = formatLogMessage("info", ...args);
    if (ENABLE_CONSOLE_LOG) {
      console.log(...args);
    }
    writeToFile(message);
  },

  info: (...args) => {
    const message = formatLogMessage("info", ...args);
    if (ENABLE_CONSOLE_LOG) {
      console.info(...args);
    }
    writeToFile(message);
  },

  warn: (...args) => {
    const message = formatLogMessage("warn", ...args);
    if (ENABLE_CONSOLE_LOG) {
      console.warn(...args);
    }
    writeToFile(message);
  },

  error: (...args) => {
    const message = formatLogMessage("error", ...args);
    if (ENABLE_CONSOLE_LOG) {
      console.error(...args);
    }
    writeToFile(message);
  },

  debug: (...args) => {
    const message = formatLogMessage("debug", ...args);
    if (ENABLE_CONSOLE_LOG) {
      console.debug(...args);
    }
    writeToFile(message);
  },
};

module.exports = logger;