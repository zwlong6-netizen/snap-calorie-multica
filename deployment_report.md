# 🚀「AI卡路里拍照识别与摄入管理」MVP 服务部署与环境交付报告

## 一、项目环境与部署概况

本阶段按照 **TASK-34**《【部署上线】AI卡路里识别与每日摄入管理MVP服务部署与环境交付》要求，完成了项目的环境配置优化、服务健康探针开发、自动化运维启动/停止脚本编制、CI/CD 流水线编排以及 Multica 本地托管环境拉起与验证。

- **应用名称**：AI卡路里拍照识别与摄入管理 MVP (`ai-calorie-tracker`)
- **运行环境**：Node.js v20+ / Alpine Linux (Docker)
- **部署模式**：Multica 本地受管环境（Daemon Managed Environment） / Shell 独立脚本 / Docker 容器化
- **托管服务访问地址**：`http://localhost:41000`
- **服务健康探针地址**：`http://localhost:41000/health` (同时兼容 `/api/health`)
- **运行日志路径**：`/Users/zwl/multica_workspaces/.environments/v1/e68465a7bf366a46/output.log`

---

## 二、核心交付物清单

| 类别 | 文件路径 | 说明 |
| :--- | :--- | :--- |
| **健康检查路由** | `server/app.js` | 增加 `/health` 与 `/api/health` 探针路由，输出运行状态、Uptime、服务版本等 |
| **平台环境配置** | `.multica/environments.toml` | Multica 守护进程受控环境配置，支持自动生命周期管理与健康检查轮询 |
| **启停自动化脚本** | `start.sh`, `stop.sh` | Shell 一键启动与优雅退出脚本，支持自定义端口 `PORT` 及 `.env` 变量注入 |
| **容器化交付物** | `Dockerfile`, `docker-compose.yml` | 生产级容器镜像构建与编排定义，内置 `HEALTHCHECK` 探针 |
| **环境配置文件** | `.env.example` | 运行配置模版（端口、数据存储、上传路径与 AI 模型参数） |
| **CI/CD 流水线** | `.github/workflows/ci.yml` | GitHub Actions 全自动集成测试与部署联通性冒烟测试流程 |
| **自动化测试用例** | `tests/api.test.js` | 新增针对 `/health` 探针路由的端到端自动化测试 |
| **文档与指引** | `README.md` | 完整的项目架构概览、本地与容器部署使用手册 |

---

## 三、部署验证与健康检查数据

### 1. 服务健康检查 (`GET /health`)
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "UP",
  "timestamp": "2026-11-22T10:37:28.725Z",
  "uptime": 4.4748185,
  "service": "ai-calorie-tracker",
  "version": "1.0.0"
}
```

### 2. 前端静态页面联通性 (`GET /`)
```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 12809
```
静态资源（HTML、CSS、JS）正常加载，激光雷达动效、能量收支看板与 Bottom Sheet 样式完备。

### 3. 后端 API 聚合接口联通性 (`GET /api/summary`)
```json
{
  "success": true,
  "data": {
    "date": "2026-11-22",
    "targetCalories": 2000,
    "consumedCalories": 1043,
    "remainingCalories": 957,
    "isOverLimit": false,
    "caloriePercentage": 52,
    "macros": {
      "protein": { "consumed": 94.5, "target": 120, "percentage": 78 },
      "fat": { "consumed": 38.6, "target": 65, "percentage": 59 },
      "carbs": { "consumed": 85.5, "target": 250, "percentage": 34 }
    }
  }
}
```

### 4. 自动化测试套件通过率
- 执行命令：`npm test`
- 结果：**36 passed, 0 failed, 0 skipped** (包含健康探针与全量端到端质量验收用例全部绿灯通过)。

---

## 四、服务运维与操作指南

### 1. Multica 环境托管指令
```bash
# 查看运行环境
multica env list

# 重新启动环境
multica env start app

# 停止托管环境
multica env stop app
```

### 2. 独立脚本操作
```bash
# 启动（默认 3000 端口）
./start.sh

# 自定义端口启动
PORT=3005 ./start.sh

# 停止服务
./stop.sh
```

### 3. Docker 操作
```bash
docker compose up -d
```
