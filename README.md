# 1024 后端管理系统服务

基于 Express + MongoDB 的后端 API 服务

## 项目结构

```
1024-back-manage-system-service/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── models/         # 数据模型
│   ├── routes/         # 路由
│   ├── scripts/        # 脚本
│   └── app.js          # 主应用文件
├── package.json
└── README.md
```

## 安装依赖

```bash
npm install
```

## 配置环境变量

创建 `.env` 文件（已包含在项目中）：

```
DB_HOST=43.133.65.211
DB_PORT=27017
DB_NAME=OZTF
DB_USER=oztf
DB_PASSWORD=OZTF1024@
PORT=1024
NODE_ENV=development
```

## 初始化数据库

运行初始化脚本，为每个表插入50条测试数据：

```bash
npm run init-db
```

## 启动服务

开发模式（使用 nodemon）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务将在 `http://localhost:1024` 启动

## API 接口

### 基础路径
`/oztf/api/v1`

### 接口列表

1. **POST /initial** - 初始化接口
2. **POST /staff/info** - 获取员工信息列表
3. **POST /staff/developers** - 获取开发人员列表
4. **POST /staff/change-status** - 修改员工状态
5. **POST /staff/department-stats** - 部门统计
6. **POST /staff/salary-level-stats** - 薪资水平统计
7. **POST /project/detail** - 获取项目详情
8. **POST /project/add** - 添加项目
9. **POST /feature/list** - 获取功能列表
10. **POST /feature/export** - 导出功能列表
11. **POST /bug/list** - 获取Bug列表
12. **POST /excalidraw/load** - 加载Excalidraw数据
13. **POST /excalidraw/save** - 保存Excalidraw数据

## 数据库表结构

所有表名以 `OZTF_` 开头，全部大写：

- `OZTF_USERS` - 用户表
- `OZTF_STAFF` - 员工表
- `OZTF_PROJECTS` - 项目表
- `OZTF_PROJECT_MEMBERS` - 项目成员表
- `OZTF_FEATURES` - 功能表
- `OZTF_BUGS` - Bug表
- `OZTF_EXCALIDRAW` - Excalidraw表

所有字段使用小驼峰命名法。

## 响应格式

所有接口统一返回格式：

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

错误响应：

```json
{
  "meta": {
    "code": "错误码",
    "message": "错误信息"
  }
}
```
