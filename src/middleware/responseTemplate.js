/**
 * 响应模板中间件
 * 扩展 res 对象，添加 res.success() 和 res.error() 方法
 */

/**
 * 成功响应模板
 * 
 * 使用示例：
 *   res.success()                                    // 只有 meta，无 data
 *   res.success(data)                                // 默认 message="Success", code="1024-S200"
 *   res.success(data, "操作成功")                    // 自定义 message
 *   res.success(data, "操作成功", "1024-S201")       // 自定义 message 和 code
 *   res.success(data, "操作成功", "1024-S201", 201) // 自定义所有参数
 * 
 * @param {*} data - 响应数据（可选）
 * @param {String} message - 自定义成功消息（可选，默认为 "Success"）
 * @param {String} code - 自定义响应码（可选，默认为 "1024-S200"）
 * @param {Number} statusCode - HTTP 状态码（可选，默认为 200）
 */
const success = function (data = null, message = "Success", code = "1024-S200", statusCode = 200) {
  const response = {
    meta: {
      code,
      message,
    },
  };

  // 如果 data 不为 null 或 undefined，则添加到响应中
  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return this.status(statusCode).json(response);
};

/**
 * 错误响应模板
 * 
 * 使用示例：
 *   res.error()                                    // 默认错误消息和码
 *   res.error("用户不存在")                        // 自定义错误消息
 *   res.error("用户不存在", "1024-E404")          // 自定义错误消息和码
 *   res.error("用户不存在", "1024-E404", 404)     // 自定义所有参数
 * 
 * @param {String} message - 错误消息（可选，默认为 "Network error: Backend service unavailable"）
 * @param {String} code - 错误码（可选，默认为 "1024-E01"）
 * @param {Number} statusCode - HTTP 状态码（可选，默认为 500）
 */
const error = function (
  message = "Network error: Backend service unavailable",
  code = "1024-E01",
  statusCode = 500
) {
  return this.status(statusCode).json({
    meta: {
      code,
      message,
    },
  });
};

/**
 * 响应模板中间件
 * 为 res 对象添加 success 和 error 方法
 */
const responseTemplate = (req, res, next) => {
  // 扩展 res 对象
  res.success = success.bind(res);
  res.error = error.bind(res);

  next();
};

module.exports = responseTemplate;
