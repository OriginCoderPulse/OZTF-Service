const fs = require("fs");
const path = require("path");
const logger = require("../scripts/logger");

// 环境变量解析工具，支持 true/false/1/0/yes/no 等
const parseBool = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(v)) return true;
  if (["0", "false", "no", "n"].includes(v)) return false;
  return defaultValue;
};

// 是否写入请求日志文件：仅由 OUTPUT_LOG 决定
const ENABLE_REQUEST_LOG_FILE = parseBool(process.env.OUTPUT_LOG, false);

// 确保 logs 目录存在（仅当需要写文件时）
const logsDir = path.join(__dirname, "../logs");
if (ENABLE_REQUEST_LOG_FILE && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * 获取当天的日志文件名
 */
const getLogFileName = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}_log.log`;
};

/**
 * 格式化日期时间
 */
const formatDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

/**
 * 写入日志到文件
 */
const writeLogToFile = (logMessage) => {
  if (!ENABLE_REQUEST_LOG_FILE) return;

  try {
    const logFileName = getLogFileName();
    const logFilePath = path.join(logsDir, logFileName);
    fs.appendFileSync(logFilePath, logMessage + "\n", "utf8");
  } catch (error) {
    // 忽略写入错误，避免影响正常请求
  }
};

/**
 * 请求日志中间件
 * 格式: [Method][DateTime]-[Path] - [成功/失败]
 * 失败时会在下面加上error信息
 */
const requestLogger = (req, res, next) => {
  const method = req.method;
  const pathName = req.path;
  const dateTime = formatDateTime();

  // 监听响应完成事件
  res.on("finish", () => {
    const statusCode = res.statusCode;
    const isSuccess = statusCode >= 200 && statusCode < 400;
    const status = isSuccess ? "Success" : "Failed";

    let logMessage = `[${method}][${dateTime}]-[${pathName}] - ${status}`;

    // 如果失败，添加错误信息
    if (!isSuccess) {
      const errorInfo = {
        statusCode: statusCode,
        statusMessage: res.statusMessage || "Unknown Error",
      };
      logMessage += `\nErrorMessage: ${JSON.stringify(errorInfo, null, 2)}`;
    }

    if (isSuccess) {
      logger.info(logMessage);
    } else {
      logger.error(logMessage);
    }

    // 根据 OUTPUT_LOG 决定是否写入日志文件
    writeLogToFile(logMessage);
  });

  // 监听错误事件
  res.on("error", (error) => {
    const status = "失败";
    let logMessage = `[${method}][${dateTime}]-[${pathName}] - ${status}`;
    logMessage += `\n错误信息: ${JSON.stringify({
      error: error.message,
      stack: error.stack,
    }, null, 2)}`;

    logger.error(logMessage);
    writeLogToFile(logMessage);
  });

  next();
};

module.exports = requestLogger;
