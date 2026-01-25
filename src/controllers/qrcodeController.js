const QRCode = require("qrcode");
const crypto = require("crypto");
const schedule = require("node-schedule");
const { getRedisClient, checkRedisAvailable } = require("../config/redis");
const { broadcastQrcodeStatus } = require("../utils/webSocket");

// Redis key前缀
const QRCODE_KEY_PREFIX = "qrcode:";

// 用于生成唯一ID的计数器（结合时间戳和随机数）
let idCounter = 0;


/**
 * 获取Redis客户端（必须可用）
 */
const getRedis = () => {
    if (!checkRedisAvailable()) {
        throw new Error("Redis未连接，请检查Redis配置");
    }
    return getRedisClient();
};

/**
 * 生成唯一的二维码ID
 * 使用时间戳 + 计数器 + 随机数确保唯一性
 */
const generateQrcodeId = () => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    idCounter = (idCounter + 1) % 1000000; // 计数器循环
    return `qrcode_${timestamp}_${idCounter}_${random}`;
};

/**
 * 获取Redis key
 */
const getQrcodeKey = (qrcodeId) => {
    return `${QRCODE_KEY_PREFIX}${qrcodeId}`;
};


/**
 * 生成二维码图片
 * 
 * @api {post} /oztf/api/v1/qrcode/generate 生成二维码
 * @apiName GenerateQrcode
 * @apiGroup Qrcode
 * 
 * @apiBody {String} content 二维码内容
 * @apiBody {Number} [size=200] 二维码尺寸（像素）
 * 
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data
 * @apiSuccess (200) {String} data.qrcodeId 二维码ID
 * @apiSuccess (200) {String} data.imageBase64 二维码图片（Base64格式）
 * @apiSuccess (200) {String} data.status 二维码状态（pending/scanned/expired）
 */
const generateQrcode = async (req, res) => {
    try {
        const { content, size = 200 } = req.body;

        if (!content) {
            return res.error("Invalid request data: content is required", "1024-C01", 400);
        }

        // 检查Redis是否可用
        if (!checkRedisAvailable()) {
            return res.error("Redis未连接，服务不可用", "1024-E01", 503);
        }

        // 生成二维码ID
        const qrcodeId = generateQrcodeId();

        // 生成二维码图片（白色前景，透明背景）
        // 二维码内容使用qrcodeId，这样移动端扫描后可以直接使用
        // 前端通过CSS添加半透明深灰色背景
        const qrcodeDataURL = await QRCode.toDataURL(qrcodeId, {
            width: size,
            margin: 2,
            color: {
                dark: "#FFFFFF", // 前景色：白色
                light: "#00000000", // 背景色：透明
            },
        });

        // 提取Base64数据（去掉data:image/png;base64,前缀）
        const imageBase64 = qrcodeDataURL.split(",")[1];

        // 初始化二维码状态
        const qrcodeStatus = {
            status: "pending", // pending: 未扫描, scanned: 已扫描, authorized: 已认证, expired: 已过期
            statusText: "请使用壹零贰肆App扫描二维码登录", // 状态文本
            createdAt: Date.now(),
            content: content,
        };

        // 存储到Redis，设置较长的TTL（10分钟），由清理任务统一管理删除
        // 这样可以确保expired状态有足够时间存在
        const redis = getRedis();
        const key = getQrcodeKey(qrcodeId);
        await redis.setEx(key, 600, JSON.stringify(qrcodeStatus)); // 10分钟TTL

        // 设置过期后的处理：3分钟后标记为expired
        // 使用 node-schedule 在3分钟后执行
        const expireTime = new Date(Date.now() + 3 * 60 * 1000); // 3分钟后
        schedule.scheduleJob(expireTime, async () => {
            try {
                if (checkRedisAvailable()) {
                    const redis = getRedisClient();
                    const statusStr = await redis.get(key);
                    if (statusStr) {
                        const status = JSON.parse(statusStr);
                        // pending或scanned状态都可以过期
                        if (status.status === "pending" || status.status === "scanned") {
                            status.status = "expired";
                            status.statusText = "二维码已过期，请刷新";
                            status.expiredAt = Date.now();
                            // 更新状态，保持原有的TTL（剩余时间足够显示过期信息）
                            // 使用PERSIST移除TTL，然后重新设置较长的TTL，确保不会自动删除
                            await redis.persist(key);
                            await redis.setEx(key, 600, JSON.stringify(status)); // 再设置10分钟，由清理任务删除

                            // 通过 WebSocket 推送过期状态（同时广播到Web端和PC端）
                            broadcastQrcodeStatus(qrcodeId, {
                                status: status.status,
                                statusText: status.statusText,
                                authorization: null,
                            });
                        }
                    }
                }
            } catch (error) {
            }
        });

        res.success({
            qrcodeId,
            imageBase64: `data:image/png;base64,${imageBase64}`,
            status: "pending",
            statusText: "请使用壹零贰肆App扫描二维码登录",
        });
    } catch (error) {
        res.error(error.message || "Network error: Backend service unavailable");
    }
};

/**
 * 确认二维码扫描（移动端扫描后调用）
 * 
 * @api {post} /oztf/api/v1/qrcode/scan 确认二维码扫描
 * @apiName ScanQrcode
 * @apiGroup Qrcode
 * 
 * @apiBody {String} qrcodeId 二维码ID
 * 
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 */
const scanQrcode = async (req, res) => {
    try {
        const { qrcodeId } = req.body;

        if (!qrcodeId) {
            return res.error("Invalid request data: qrcodeId is required", "1024-C01", 400);
        }

        // 检查Redis是否可用
        if (!checkRedisAvailable()) {
            return res.error("Redis未连接，服务不可用", "1024-E01", 503);
        }

        const redis = getRedis();
        const key = getQrcodeKey(qrcodeId);
        const statusStr = await redis.get(key);

        if (!statusStr) {
            return res.error("Qrcode not found", "1024-B01", 404);
        }

        const qrcodeStatus = JSON.parse(statusStr);
        
        const now = Date.now();
        const expiredThreshold = 3 * 60 * 1000; // 3分钟过期时间

        // 检查是否过期
        if (qrcodeStatus.createdAt && (now - qrcodeStatus.createdAt > expiredThreshold)) {
            return res.error("Qrcode expired", "1024-C03", 400);
        }

        if (qrcodeStatus.status !== "pending") {
            return res.error("Qrcode already processed", "1024-C02", 400);
        }

        // 更新状态为已扫描（不传authorization和userId）
        qrcodeStatus.status = "scanned";
        qrcodeStatus.statusText = "已扫描，等待确认...";
        qrcodeStatus.scannedAt = Date.now();

        // 更新到Redis，保留1小时（3600秒）用于日志和调试
        await redis.setEx(key, 3600, JSON.stringify(qrcodeStatus));

        // 通过 WebSocket 推送状态变更（同时广播到Web端和PC端）
        try {
            broadcastQrcodeStatus(qrcodeId, {
                status: qrcodeStatus.status,
                statusText: qrcodeStatus.statusText,
                authorization: null,
            });
        } catch (error) {
        }

        res.success();
    } catch (error) {
        res.error(error.message || "Network error: Backend service unavailable");
    }
};

/**
 * 确认二维码认证（移动端在认证页面调用）
 * 
 * @api {post} /oztf/api/v1/qrcode/authorize 确认二维码认证
 * @apiName AuthorizeQrcode
 * @apiGroup Qrcode
 * 
 * @apiBody {String} qrcodeId 二维码ID
 * @apiBody {String} userId 用户ID
 * 
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 */
const authorizeQrcode = async (req, res) => {
    try {
        const { qrcodeId, userId } = req.body;

        if (!qrcodeId || !userId) {
            return res.error("Invalid request data: qrcodeId and userId are required", "1024-C01", 400);
        }

        // 检查Redis是否可用
        if (!checkRedisAvailable()) {
            return res.error("Redis未连接，服务不可用", "1024-E01", 503);
        }

        const redis = getRedis();
        const key = getQrcodeKey(qrcodeId);
        const statusStr = await redis.get(key);

        if (!statusStr) {
            return res.error("Qrcode not found", "1024-B01", 404);
        }

        const qrcodeStatus = JSON.parse(statusStr);
        const now = Date.now();
        const expiredThreshold = 3 * 60 * 1000; // 3分钟过期时间

        // 检查二维码状态是否为已过期
        if (qrcodeStatus.status === "expired") {
            return res.error("Qrcode expired", "1024-C03", 400);
        }

        // 检查是否过期（根据创建时间判断）
        if (qrcodeStatus.createdAt && (now - qrcodeStatus.createdAt > expiredThreshold)) {
            // 更新为过期状态
            qrcodeStatus.status = "expired";
            qrcodeStatus.statusText = "二维码已过期，请刷新";
            qrcodeStatus.expiredAt = Date.now();
            await redis.persist(key);
            await redis.setEx(key, 600, JSON.stringify(qrcodeStatus));

            return res.error("Qrcode expired", "1024-C03", 400);
        }

        if (qrcodeStatus.status !== "scanned") {
            return res.error("Qrcode status is not scanned", "1024-C02", 400);
        }

        // 更新状态为已认证，保存userId和authorization
        // 获取员工信息以获取部门（权限）
        const Staff = require("../models/Staff");
        const staff = await Staff.findById(userId).populate("department");
        const permission = staff && staff.department ? staff.department.name : "CEO";

        // 生成真正的 JWT token（包含 userID 和 permission）
        const { generateToken } = require("../utils/generateToken");
        const token = generateToken(userId, permission);

        qrcodeStatus.status = "authorized";
        qrcodeStatus.statusText = "已认证，正在登录...";
        qrcodeStatus.userId = userId;
        qrcodeStatus.authorization = token; // authorization是JWT token字符串
        qrcodeStatus.authorizedAt = Date.now();

        // 更新到Redis，保留1小时（3600秒）用于日志和调试
        await redis.setEx(key, 3600, JSON.stringify(qrcodeStatus));

        // 通过 WebSocket 推送状态变更（同时广播到Web端和PC端）
        try {
            broadcastQrcodeStatus(qrcodeId, {
                status: qrcodeStatus.status,
                statusText: qrcodeStatus.statusText,
                authorization: qrcodeStatus.authorization,
            });
        } catch (error) {
        }

        res.success();
    } catch (error) {
        res.error(error.message || "Network error: Backend service unavailable");
    }
};

module.exports = {
    generateQrcode,
    scanQrcode,
    authorizeQrcode,
};
