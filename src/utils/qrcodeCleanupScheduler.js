const { getRedisClient, checkRedisAvailable } = require("../config/redis");
const schedule = require("node-schedule");

// Redis key前缀
const QRCODE_KEY_PREFIX = "qrcode:";

// 清理定时任务
let cleanupJob = null;

// 定时任务执行规则：每10分钟执行一次
const CLEANUP_JOB_RULE = "*/10 * * * *"; // 每10分钟

/**
 * 清理Redis中过期的二维码
 * 删除：1. 已过期的二维码（超过3分钟）
 *       2. 已扫描的二维码（扫描后保留1小时，用于日志和调试）
 *       3. 已认证的二维码（认证后保留1小时，用于日志和调试）
 *       4. 已过期状态的二维码（过期后保留60秒）
 * 
 * 注意：只删除在清理任务开始时间之前创建的二维码，避免删除清理过程中新创建的
 */
const cleanupExpiredQrcodes = async () => {
    try {
        if (!checkRedisAvailable()) {
            return;
        }

        // 记录清理任务开始时间，只处理在此时间之前创建的二维码
        const cleanupStartTime = Date.now();
        const redis = getRedisClient();
        const now = Date.now();
        const expiredThreshold = 3 * 60 * 1000; // 3分钟 - 过期时间
        const scannedRetentionTime = 60 * 60 * 1000; // 1小时 - 已扫描/已认证二维码保留时间

        // 获取所有二维码key
        const keys = await redis.keys(`${QRCODE_KEY_PREFIX}*`);
        let cleanedCount = 0;

        for (const key of keys) {
            try {
                const statusStr = await redis.get(key);
                if (statusStr) {
                    const status = JSON.parse(statusStr);

                    // 只处理在清理任务开始时间之前创建的二维码
                    // 这样可以避免删除清理过程中新创建的二维码
                    if (status.createdAt && status.createdAt >= cleanupStartTime) {
                        continue; // 跳过在清理开始后创建的二维码
                    }

                    const age = now - status.createdAt;

                    // 删除pending状态且超过3分钟的二维码
                    if (status.status === "pending" && age > expiredThreshold) {
                        await redis.del(key);
                        cleanedCount++;
                    }
                    // 删除expired状态且过期时间超过60秒的二维码（给前端显示过期信息的时间）
                    else if (status.status === "expired" && status.expiredAt) {
                        const expiredAge = now - status.expiredAt;
                        if (expiredAge > 60 * 1000) { // 过期后保留60秒
                            await redis.del(key);
                            cleanedCount++;
                        }
                    }
                    // 删除已扫描且超过保留时间的二维码
                    else if (status.status === "scanned" && status.scannedAt) {
                        const scannedAge = now - status.scannedAt;
                        if (scannedAge > scannedRetentionTime) {
                            await redis.del(key);
                            cleanedCount++;
                        }
                    }
                    // 删除已认证且超过保留时间的二维码
                    else if (status.status === "authorized" && status.authorizedAt) {
                        const authorizedAge = now - status.authorizedAt;
                        if (authorizedAge > scannedRetentionTime) {
                            await redis.del(key);
                            cleanedCount++;
                        }
                    }
                }
            } catch (error) {
            }
        }
    } catch (error) {
    }
};

/**
 * 启动定期清理任务
 * 每10分钟清理一次过期的二维码
 */
const startCleanupTimer = () => {
    if (cleanupJob) {
        return; // 已经启动
    }

    // 立即执行一次清理
    cleanupExpiredQrcodes();

    // 使用 node-schedule 创建定时任务，每10分钟执行一次
    cleanupJob = schedule.scheduleJob(CLEANUP_JOB_RULE, () => {
        cleanupExpiredQrcodes();
    });
};

/**
 * 停止清理定时任务
 */
const stopCleanupTimer = () => {
    if (cleanupJob) {
        cleanupJob.cancel();
        cleanupJob = null;
    }
};

/**
 * 初始化二维码清理任务
 * 在服务器启动时调用，启动定期清理任务
 */
const initializeCleanupTask = async () => {
    try {
        // 等待Redis连接（如果Redis可用，则启动清理任务）
        if (checkRedisAvailable()) {
            startCleanupTimer();
        }
    } catch (error) {
    }
};

module.exports = {
    startCleanupTimer,
    stopCleanupTimer,
    initializeCleanupTask,
    cleanupExpiredQrcodes,
};
