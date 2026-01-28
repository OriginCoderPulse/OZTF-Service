// 环境变量解析工具，支持 true/false/1/0/yes/no 等
const parseBool = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(v)) return true;
  if (["0", "false", "no", "n"].includes(v)) return false;
  return defaultValue;
};

// 是否在控制台输出：仅由 SHOW_TERMINAL_CONSOLE 决定（不区分环境）
const ENABLE_CONSOLE_LOG = parseBool(process.env.SHOW_TERMINAL_CONSOLE, true);

// 简单格式化：带时间和级别前缀
const formatLogPrefix = (level) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}]`;
};

// 创建日志对象（只输出到控制台，不写任何文件）
const logger = {
  log: (...args) => {
    if (!ENABLE_CONSOLE_LOG) return;
    console.log(formatLogPrefix("info"), ...args);
  },

  info: (...args) => {
    if (!ENABLE_CONSOLE_LOG) return;
    console.info(formatLogPrefix("info"), ...args);
  },

  warn: (...args) => {
    if (!ENABLE_CONSOLE_LOG) return;
    console.warn(formatLogPrefix("warn"), ...args);
  },

  error: (...args) => {
    if (!ENABLE_CONSOLE_LOG) return;
    console.error(formatLogPrefix("error"), ...args);
  },

  debug: (...args) => {
    if (!ENABLE_CONSOLE_LOG) return;
    console.debug(formatLogPrefix("debug"), ...args);
  },
};

module.exports = logger;