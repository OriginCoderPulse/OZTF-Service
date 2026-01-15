const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const { initializeScheduledTasks } = require('./utils/meetStatusScheduler');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/oztf/api/v1/static', express.static(path.join(__dirname, '../public/static')));

// 连接数据库
connectDB().then(() => {
    // 数据库连接成功后初始化所有会议定时任务
    initializeScheduledTasks();
});

// 路由
app.use('/oztf/api/v1/initial', require('./routes/initial'));
app.use('/oztf/api/v1/staff', require('./routes/staff'));
app.use('/oztf/api/v1/project', require('./routes/project'));
app.use('/oztf/api/v1/feature', require('./routes/feature'));
app.use('/oztf/api/v1/bug', require('./routes/bug'));
app.use('/oztf/api/v1/meet', require('./routes/meet'));

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Service is running' });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        meta: {
            code: '1024-E01',
            message: 'Network error: Backend service unavailable'
        }
    });
});

const PORT = process.env.PORT || 1024;

app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app;
