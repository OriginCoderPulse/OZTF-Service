const redis = require("redis");
require("dotenv").config();

let redisClient = null;
let isRedisAvailable = false;

const connectRedis = async () => {
    try {
        const redisConfig = {
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || "0"),
        };

        redisClient = redis.createClient({
            socket: {
                host: redisConfig.host,
                port: redisConfig.port,
                connectTimeout: 5000, // 5秒连接超时
                reconnectStrategy: (retries) => {
                    if (retries > 3) {
                        console.warn("Redis重连次数超过3次，停止重连");
                        return false; // 停止重连
                    }
                    return Math.min(retries * 100, 3000); // 最多等待3秒
                },
            },
            password: redisConfig.password,
            database: redisConfig.db,
        });

        redisClient.on("error", (err) => {
            console.error("Redis Client Error:", err.message);
            isRedisAvailable = false;
        });

        redisClient.on("connect", () => {
            console.log("Redis 连接中...");
        });

        redisClient.on("ready", () => {
            console.log("Redis 连接成功");
            isRedisAvailable = true;
        });

        redisClient.on("reconnecting", () => {
            console.log("Redis 重新连接中...");
        });

        // 设置连接超时
        const connectPromise = redisClient.connect();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Redis连接超时")), 5000);
        });

        await Promise.race([connectPromise, timeoutPromise]);
        isRedisAvailable = true;
        return Promise.resolve();
    } catch (error) {
        console.warn("Redis 连接失败，将使用内存存储:", error.message);
        isRedisAvailable = false;
        // Redis连接失败不阻止应用启动，返回成功但标记为不可用
        return Promise.resolve();
    }
};

const getRedisClient = () => {
    if (!redisClient || !isRedisAvailable) {
        throw new Error("Redis不可用");
    }
    return redisClient;
};

const checkRedisAvailable = () => {
    return isRedisAvailable && redisClient !== null;
};

const closeRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log("Redis 连接已关闭");
    }
};

module.exports = {
    connectRedis,
    getRedisClient,
    closeRedis,
    checkRedisAvailable,
};
