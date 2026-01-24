/**
 * JWT Token 生成和验证工具
 */

const jwt = require("jsonwebtoken");

// 从环境变量获取密钥，如果没有则使用默认值（生产环境必须设置）
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "default-secret-key-change-in-production";

/**
 * 生成 JWT Token
 * @param {string} userId - 用户ID（MongoDB ObjectId）
 * @param {string} permission - 权限（部门名称），可选
 * @returns {string} JWT Token 字符串
 */
function generateToken(userId, permission = null) {
    if (!userId) {
        throw new Error("userId is required");
    }

    const payload = {
        userId,
        ...(permission && { permission }),
    };

    // Token 永不过期（根据需求）
    return jwt.sign(payload, JWT_SECRET_KEY);
}

/**
 * 验证并解析 JWT Token
 * @param {string} token - JWT Token 字符串
 * @returns {object} { valid: boolean, userId?: string, permission?: string, error?: string }
 */
function verifyToken(token) {
    if (!token) {
        return {
            valid: false,
            error: "Token is required",
        };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        return {
            valid: true,
            userId: decoded.userId,
            permission: decoded.permission || null,
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message || "Invalid token",
        };
    }
}

module.exports = {
    generateToken,
    verifyToken,
};
