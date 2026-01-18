# TRTC 配置指南

## 问题：TRTC configuration is missing

如果遇到此错误，说明 `.env` 文件中缺少 TRTC 配置。

## 解决步骤

### 1. 打开 `.env` 文件

在项目根目录 `OZTF-Service/` 下找到 `.env` 文件并打开。

### 2. 添加 TRTC 配置

在 `.env` 文件末尾添加以下配置：

```env
# TRTC 配置（用于生成 UserSig）
# 请从腾讯云 TRTC 控制台获取：https://console.cloud.tencent.com/trtc
# 应用管理 -> 应用信息 -> SDKAppID 和 密钥
TRTC_APP_ID=你的TRTC_APP_ID
TRTC_SECRET_KEY=你的TRTC_SECRET_KEY
```

### 3. 获取 TRTC 配置信息

1. 访问 [腾讯云 TRTC 控制台](https://console.cloud.tencent.com/trtc)
2. 登录您的腾讯云账号
3. 进入 **应用管理** -> **应用信息**
4. 找到您的应用，复制：
   - **SDKAppID** → 填入 `TRTC_APP_ID`
   - **密钥** → 填入 `TRTC_SECRET_KEY`

### 4. 配置示例

```env
# 数据库配置
DB_HOST=43.133.65.211
DB_PORT=27017
DB_NAME=OZTF
DB_USER=oztf
DB_PASSWORD=OZTF1024@

# 服务配置
PORT=1024
NODE_ENV=development

# TRTC 配置（用于生成 UserSig）
TRTC_APP_ID=1600122280
TRTC_SECRET_KEY=your_secret_key_here
```

### 5. 验证配置

配置完成后，重启服务：

```bash
npm run dev
# 或
npm start
```

如果配置正确，您会看到：
```
✅ 环境变量验证通过
服务器运行在端口 1024
```

### 6. 常见错误

**错误 1：TRTC_APP_ID is not set**
- 解决：在 `.env` 文件中添加 `TRTC_APP_ID=你的AppID`

**错误 2：TRTC_SECRET_KEY is not set**
- 解决：在 `.env` 文件中添加 `TRTC_SECRET_KEY=你的SecretKey`

**错误 3：TRTC_APP_ID must be a valid number**
- 解决：确保 `TRTC_APP_ID` 是纯数字，不要加引号

**错误 4：TRTC_SECRET_KEY must be a non-empty string**
- 解决：确保 `TRTC_SECRET_KEY` 有值且不是空字符串

## 注意事项

- `.env` 文件不要提交到 Git（已在 .gitignore 中）
- `TRTC_SECRET_KEY` 是敏感信息，请妥善保管
- 修改 `.env` 文件后需要重启服务才能生效
- `TRTC_APP_ID` 必须是数字类型，不要加引号
- `TRTC_SECRET_KEY` 是字符串类型，不需要加引号（除非值中包含特殊字符）
