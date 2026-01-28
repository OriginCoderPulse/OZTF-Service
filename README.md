# OZTF 后端服务

基于 Express + MongoDB 的企业级后端 API 服务，为 OZTF 管理系统提供数据支撑。

## 📋 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [API 接口文档](#api-接口文档)
- [数据库设计](#数据库设计)
- [开发指南](#开发指南)

## 项目概述

OZTF 后端服务是一个企业级管理系统后端，提供以下核心功能：

- **员工管理**：员工信息管理
- **项目管理**：项目创建、详情查询、成员管理
- **功能管理**：功能列表、导出、工时统计
- **Bug 管理**：Bug 列表、状态跟踪
- **会议管理**：会议创建、状态管理、定时任务
- **数据初始化**：系统初始化接口

## 技术栈

- **运行环境**：Node.js
- **框架**：Express 4.x
- **数据库**：MongoDB (Mongoose)
- **工具库**：
  - `cors` - 跨域支持
  - `dotenv` - 环境变量管理
  - `exceljs` - Excel 导出
  - `moment` - 时间处理
  - `nodemon` - 开发热重载

## 项目结构

```
OZTF-Service/
├── src/
│   ├── app.js                 # 应用入口文件
│   ├── config/
│   │   └── database.js        # 数据库配置
│   ├── controllers/           # 控制器层
│   │   ├── initialController.js
│   │   ├── staffController.js
│   │   ├── projectController.js
│   │   ├── featureController.js
│   │   ├── bugController.js
│   │   └── meetController.js
│   ├── models/               # 数据模型
│   │   ├── User.js
│   │   ├── Staff.js
│   │   ├── Department.js
│   │   ├── Project.js
│   │   ├── ProjectMember.js
│   │   ├── Feature.js
│   │   ├── Bug.js
│   │   ├── MeetRoom.js
│   │   ├── Permission.js
│   │   ├── Role.js
│   │   ├── RolePermission.js
│   │   └── DepartmentPermission.js
│   ├── routes/               # 路由定义
│   │   ├── initial.js
│   │   ├── staff.js
│   │   ├── project.js
│   │   ├── feature.js
│   │   ├── bug.js
│   │   └── meet.js
│   ├── utils/                # 工具函数
│   │   ├── meetStatusScheduler.js  # 会议状态定时任务
│   │   └── generateUserSig.js     # UserSig 生成工具
│   └── public/               # 静态资源
│       ├── static/           # 静态文件
│       └── temp/             # 临时文件
├── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件（项目根目录）：

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
# 请从腾讯云 TRTC 控制台获取：https://console.cloud.tencent.com/trtc
# 应用管理 -> 应用信息 -> SDKAppID 和 密钥
TRTC_APP_ID=你的TRTC_APP_ID
TRTC_SECRET_KEY=你的TRTC_SECRET_KEY
```

**⚠️ 重要提示**：
- `TRTC_APP_ID` 必须是数字类型（不要加引号）
- `TRTC_SECRET_KEY` 必须是字符串类型（不需要加引号，除非值中包含特殊字符）
- 如果环境变量未配置，服务启动时会自动检测并提示错误
- 如果配置错误，生成 UserSig 接口会返回详细的错误信息
- **如果遇到配置问题，请参考 `CONFIG_GUIDE.md` 文件**

**🔧 快速修复**：
如果遇到 "TRTC configuration is missing" 错误，请在 `.env` 文件中添加：
```env
TRTC_APP_ID=你的TRTC_APP_ID
TRTC_SECRET_KEY=你的TRTC_SECRET_KEY
```
然后重启服务。

### 3. 验证环境变量

服务启动时会自动验证所有必要的环境变量。如果缺少或格式错误，服务将无法启动并显示详细的错误信息。

**验证通过示例**：
```
✅ 环境变量验证通过
服务器运行在端口 1024
```

**验证失败示例**：
```
❌ 缺少必要的环境变量:
   - TRTC_APP_ID
   - TRTC_SECRET_KEY

请检查 .env 文件配置。
```

### 4. 初始化数据库

运行初始化脚本，为每个表插入测试数据：

```bash
npm run init-db
```

### 5. 启动服务

**开发模式**（使用 nodemon，支持热重载）：

```bash
npm run dev
```

**生产模式**：

```bash
npm start
```

服务启动后，访问 `http://localhost:1024` 即可。

**健康检查**：

```bash
curl http://localhost:1024/health
```

## 环境配置

### 环境变量说明

| 变量名 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| `DB_HOST` | MongoDB 主机地址 | ✅ | - |
| `DB_PORT` | MongoDB 端口 | ✅ | 27017 |
| `DB_NAME` | 数据库名称 | ✅ | - |
| `DB_USER` | 数据库用户名 | ✅ | - |
| `DB_PASSWORD` | 数据库密码 | ✅ | - |
| `PORT` | 服务端口 | ❌ | 1024 |
| `NODE_ENV` | 运行环境 | ❌ | development |
| `TRTC_APP_ID` | TRTC SDK AppID | ✅ | - |
| `TRTC_SECRET_KEY` | TRTC SecretKey | ✅ | - |

## API 接口文档

### 基础信息

- **基础路径**：`/oztf/api/v1`
- **请求方式**：所有接口统一使用 `POST` 方法
- **Content-Type**：`application/json`

### 统一响应格式

**成功响应**：

```json
{
  "meta": {
    "code": "1024-S200",
    "message": "Success"
  },
  "data": {
    // 数据内容
  }
}
```

**错误响应**：

```json
{
  "meta": {
    "code": "错误码",
    "message": "错误信息"
  }
}
```

### 接口列表

#### 1. 初始化接口

**路径**：`POST /oztf/api/v1/initial`

**功能**：系统初始化，返回基础配置信息

**请求参数**：无

**响应示例**：

```json
{
  "meta": {
    "code": "1024-S200",
    "message": "Success"
  },
  "data": {
    "version": "1.0.0",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 2. 员工管理

##### 2.1 获取员工信息列表

**路径**：`POST /oztf/api/v1/staff/info`

**请求参数**：

```json
{
  "page": 1,
  "pageSize": 10,
  "keyword": "",
  "department": "",
  "status": ""
}
```

##### 2.2 获取开发人员列表

**路径**：`POST /oztf/api/v1/staff/developers`

**请求参数**：

```json
{
  "projectId": "项目ID"
}
```

##### 2.3 修改员工状态

**路径**：`POST /oztf/api/v1/staff/change-status`

**请求参数**：

```json
{
  "staffId": "员工ID",
  "status": "Active|Inactive"
}
```

#### 3. 项目管理

##### 3.1 获取项目详情

**路径**：`POST /oztf/api/v1/project/detail`

**请求参数**：

```json
{
  "projectId": "项目ID"
}
```

##### 3.2 添加项目

**路径**：`POST /oztf/api/v1/project/add`

**请求参数**：

```json
{
  "name": "项目名称",
  "description": "项目描述",
  "managerId": "项目经理ID",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "priority": "High|Medium|Low|Critical"
}
```

#### 4. 功能管理

##### 4.1 获取功能列表

**路径**：`POST /oztf/api/v1/feature/list`

**请求参数**：

```json
{
  "projectId": "项目ID",
  "page": 1,
  "pageSize": 10,
  "status": "",
  "assigneeId": ""
}
```

##### 4.2 导出功能列表

**路径**：`POST /oztf/api/v1/feature/export`

**请求参数**：

```json
{
  "projectId": "项目ID",
  "filters": {}
}
```

**响应**：返回 Excel 文件下载链接

#### 5. Bug 管理

##### 5.1 获取 Bug 列表

**路径**：`POST /oztf/api/v1/bug/list`

**请求参数**：

```json
{
  "projectId": "项目ID",
  "page": 1,
  "pageSize": 10,
  "status": "",
  "severity": ""
}
```

#### 6. 会议管理

##### 6.1 获取会议室属性

**路径**：`POST /oztf/api/v1/meet/getRoomProperties`

**请求参数**：

```json
{
  "meetId": "会议ID"
}
```

##### 6.2 添加外部参会人

**路径**：`POST /oztf/api/v1/meet/addOutParticipant`

**请求参数**：

```json
{
  "meetId": "会议ID",
  "trtcId": "TRTC用户ID",
  "participantInfo": "参会人信息JSON字符串"
}
```

##### 6.3 删除外部参会人

**路径**：`POST /oztf/api/v1/meet/removeOutParticipant`

**请求参数**：

```json
{
  "meetId": "会议ID",
  "trtcId": "TRTC用户ID"
}
```

##### 6.4 生成 UserSig

**路径**：`POST /oztf/api/v1/meet/generate-usersig`

**功能**：为指定用户生成 TRTC UserSig

**请求参数**：

```json
{
  "userId": "用户ID"
}
```

**响应示例**：

```json
{
  "meta": {
    "code": "1024-S200",
    "message": "Success"
  },
  "data": {
    "sdkAppId": 1600122280,
    "userSig": "生成的UserSig字符串"
  }
}
```

**注意**：此接口需要配置 `TRTC_APP_ID` 和 `TRTC_SECRET_KEY` 环境变量。

## 数据库设计

### 命名规范

- **表名**：以 `OZTF_` 开头，全部大写，使用下划线分隔
- **字段名**：使用小驼峰命名法（camelCase）

### 数据表列表

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `OZTF_USERS` | 用户表 | userId, username, password, role |
| `OZTF_STAFF` | 员工表 | staffId, name, department, position, salary |
| `OZTF_DEPARTMENTS` | 部门表 | departmentId, name, managerId |
| `OZTF_PROJECTS` | 项目表 | projectId, name, status, managerId, startDate, endDate |
| `OZTF_PROJECT_MEMBERS` | 项目成员表 | projectId, staffId, role |
| `OZTF_FEATURES` | 功能表 | featureId, name, projectId, assigneeId, status, priority |
| `OZTF_BUGS` | Bug表 | bugId, name, projectId, severity, status, assigneeId |
| `OZTF_MEET_ROOMS` | 会议室表 | meetId, roomId, status, startTime, endTime |
| `OZTF_PERMISSIONS` | 权限表 | permissionId, name, resource, action |
| `OZTF_ROLES` | 角色表 | roleId, name, description |
| `OZTF_ROLE_PERMISSIONS` | 角色权限关联表 | roleId, permissionId |
| `OZTF_DEPARTMENT_PERMISSIONS` | 部门权限关联表 | departmentId, permissionId |

### 索引设计

- `OZTF_STAFF`: `departmentId`, `status`
- `OZTF_PROJECTS`: `managerId`, `status`
- `OZTF_FEATURES`: `projectId`, `assigneeId`
- `OZTF_BUGS`: `projectId`, `status`, `severity`

## 开发指南

### 添加新接口

1. **创建模型**（如需要）：在 `src/models/` 下创建新的模型文件
2. **创建控制器**：在 `src/controllers/` 下创建控制器文件
3. **创建路由**：在 `src/routes/` 下创建路由文件
4. **注册路由**：在 `src/app.js` 中注册新路由

### 代码规范

- 使用 ES6+ 语法
- 遵循 RESTful API 设计规范
- 统一错误处理和响应格式
- 添加必要的注释

### 定时任务

会议状态定时任务在 `src/utils/meetStatusScheduler.js` 中实现，系统启动时自动初始化。

### 静态文件服务

静态文件通过 `/oztf/api/v1/static` 路径访问，文件存储在 `public/static/` 目录。

### 错误处理

所有错误统一在 `app.js` 的错误处理中间件中处理，返回统一的错误格式。

## 常见问题

### 1. 数据库连接失败

检查 `.env` 文件中的数据库配置是否正确，确保数据库服务正在运行。

### 2. 端口被占用

修改 `.env` 文件中的 `PORT` 变量，或使用其他可用端口。

### 3. CORS 跨域问题

已在 `app.js` 中配置了 CORS 中间件，如仍有问题，检查前端请求头配置。

## 许可证

ISC
