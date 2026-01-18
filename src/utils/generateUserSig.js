const crypto = require("crypto");
const pako = require("pako");

/**
 * 生成 UserSig
 * @param {number} sdkAppId - TRTC SDK AppID
 * @param {string} userId - 用户ID
 * @param {string} secretKey - TRTC SecretKey
 * @param {number} expire - 过期时间（秒），默认 604800（7天）
 * @returns {Object} { sdkAppId, userSig }
 */
function generateUserSig(sdkAppId, userId, secretKey, expire = 604800) {
  // 参数验证
  if (!sdkAppId || typeof sdkAppId !== "number" || isNaN(sdkAppId)) {
    return { sdkAppId, userSig: "" };
  }
  if (!secretKey || typeof secretKey !== "string") {
    return { sdkAppId, userSig: "" };
  }
  if (!userId || typeof userId !== "string") {
    return { sdkAppId, userSig: "" };
  }

  const time = Math.floor(Date.now() / 1000);
  const sigObj = {
    "TLS.ver": "2.0",
    "TLS.identifier": userId,
    "TLS.sdkappid": sdkAppId,
    "TLS.time": time,
    "TLS.expire": expire,
  };

  // 生成签名
  const sig = hmacSHA256(sdkAppId, secretKey, userId, time, expire, null);
  sigObj["TLS.sig"] = sig;

  // 序列化并压缩
  const jsonStr = JSON.stringify(sigObj);
  const jsonBytes = Buffer.from(jsonStr, "utf8");
  const compressed = pako.deflate(jsonBytes);
  const base64Compressed = Buffer.from(compressed).toString("base64");
  const escaped = escape(base64Compressed);

  return {
    sdkAppId,
    userSig: escaped,
  };
}

/**
 * HMAC-SHA256 签名
 */
function hmacSHA256(sdkAppId, privateKey, identifier, time, expire, userbuf) {
  let content = `TLS.identifier:${identifier}\n`;
  content += `TLS.sdkappid:${sdkAppId}\n`;
  content += `TLS.time:${time}\n`;
  content += `TLS.expire:${expire}\n`;
  if (userbuf != null) {
    content += `TLS.userbuf:${userbuf}\n`;
  }

  const hmac = crypto.createHmac("sha256", privateKey);
  hmac.update(content);
  return hmac.digest("base64");
}

/**
 * Base64 转义（与前端保持一致）
 */
function escape(str) {
  return str.replace(/\+/g, "*").replace(/\//g, "-").replace(/=/g, "_");
}

module.exports = { generateUserSig };
