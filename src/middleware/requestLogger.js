const fs = require("fs");
const path = require("path");

// 确保 logs 目录存在
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
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
  try {
    const logFileName = getLogFileName();
    const logFilePath = path.join(logsDir, logFileName);
    fs.appendFileSync(logFilePath, logMessage + "\n", "utf8");
  } catch (error) {
  }
};

/**
 * 请求日志中间件
 * 格式: [Method][DateTime]-[Path]
 */
const requestLogger = (req, res, next) => {
  const method = req.method;
  const path = req.path;
  const dateTime = formatDateTime();
  const logMessage = `[${method}][${dateTime}]-[${path}]`;

  // 写入日志文件
  writeLogToFile(logMessage);

  next();
};

module.exports = requestLogger;
