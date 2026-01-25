const express = require("express");
const cors = require("cors");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/database");
const { connectRedis } = require("./config/redis");
const { initializeScheduledTasks } = require("./utils/meetStatusScheduler");
const { initializeCleanupTask } = require("./utils/qrcodeCleanupScheduler");
const { initializeWebSocket } = require("./utils/webSocket");
const requestLogger = require("./middleware/requestLogger");
const responseTemplate = require("./middleware/responseTemplate");
require("dotenv").config();

// 验证必要的环境变量
function validateEnvironmentVariables() {
  const requiredVars = [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "TRTC_APP_ID",
    "TRTC_SECRET_KEY",
  ];

  const missingVars = [];
  const invalidVars = [];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // 验证 TRTC_APP_ID 是否为有效数字
  if (process.env.TRTC_APP_ID && isNaN(Number(process.env.TRTC_APP_ID))) {
    invalidVars.push("TRTC_APP_ID (must be a number)");
  }

  if (missingVars.length > 0) {
    process.exit(1);
  }

  if (invalidVars.length > 0) {
    process.exit(1);
  }
}

// 启动时验证环境变量
validateEnvironmentVariables();

const app = express();
const httpServer = createServer(app);

// 初始化 Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// 初始化统一 WebSocket 服务（处理所有命名空间）
initializeWebSocket(io);

// 信任代理（用于正确获取客户端真实 IP）
app.set("trust proxy", true);

// 中间件
// 1. 请求日志中间件
app.use(requestLogger);

// 2. 响应模板中间件
app.use(responseTemplate);

// 3. 其他中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use("/oztf/api/v1/static", express.static(path.join(__dirname, "../public/static")));

// 连接数据库
connectDB().then(() => {
  // 数据库连接成功后初始化所有会议定时任务
  initializeScheduledTasks();
});

// 连接Redis（可选，失败不影响应用启动）
connectRedis()
  .then(() => {
    // Redis连接成功后初始化二维码清理任务
    initializeCleanupTask();
  })
  .catch((err) => {
  });

// 路由
app.use("/oztf/api/v1/initial", require("./routes/initial"));
app.use("/oztf/api/v1/staff", require("./routes/staff"));
app.use("/oztf/api/v1/project", require("./routes/project"));
app.use("/oztf/api/v1/feature", require("./routes/feature"));
app.use("/oztf/api/v1/bug", require("./routes/bug"));
app.use("/oztf/api/v1/meet", require("./routes/meet"));
app.use("/oztf/api/v1/qrcode", require("./routes/qrcode"));

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Service is running" });
});

// 错误处理
app.use((err, req, res, next) => {
  // 使用响应模板中间件提供的 res.error() 方法
  res.error("Network error: Backend service unavailable", "1024-E01", 500);
});

const PORT = process.env.PORT || 1024;

httpServer.listen(PORT, () => {
});

module.exports = { app, io };
