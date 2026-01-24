/**
 * 密码加密和验证工具
 */

const bcrypt = require("bcryptjs");

// bcrypt 加密轮数（salt rounds），值越大越安全但越慢，推荐 10-12
const SALT_ROUNDS = 10;

/**
 * 加密密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 加密后的密码哈希值
 */
async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  return await bcrypt.hash(password.trim(), SALT_ROUNDS);
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hashedPassword - 加密后的密码哈希值
 * @returns {Promise<boolean>} 密码是否正确
 */
async function comparePassword(password, hashedPassword) {
  if (!password || typeof password !== "string") {
    return false;
  }
  if (!hashedPassword || typeof hashedPassword !== "string") {
    return false;
  }
  
  // 如果哈希值看起来不像 bcrypt 哈希（以 $2a$, $2b$, $2y$ 开头），可能是旧数据（明文）
  // 为了兼容旧数据，先尝试直接比较
  if (!hashedPassword.startsWith("$2a$") && !hashedPassword.startsWith("$2b$") && !hashedPassword.startsWith("$2y$")) {
    // 旧数据（明文），直接比较
    return password.trim() === hashedPassword.trim();
  }
  
  // 新数据（加密），使用 bcrypt 比较
  return await bcrypt.compare(password.trim(), hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword,
};
