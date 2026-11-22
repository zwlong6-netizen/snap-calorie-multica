# 🥗 AI 卡路里拍照识别与摄入管理 MVP (AI Calorie Tracker)

基于 AI 计算机视觉食物识别与健康摄入管理的轻量级 Web 应用，提供食物拍照智能识别（含重量与三大营养素推断）、每日热量收支动态看板、餐次时间轴与便捷微调能力。

---

## 🌟 核心特性与架构

- **AI 拍照识别**：通过 `/api/food/recognize` 智能分析食物图像特征，提取卡路里、克重、蛋白质、脂肪、碳水化合物，具备本地离线高保真兜底引擎。
- **动态差额看板**：今日能量收支仪表盘、三大宏量营养素环形/条形进度、动态超标告警。
- **全端响应式与交互**：遵循统一设计系统规范色（健康绿、蛋白质蓝、脂肪橙、碳水粉），支持移动端半屏浮层 (Bottom Sheet) 档位吸附。
- **服务健康探针**：提供 `/health` 与 `/api/health` 探针路由，实时暴露运行时状态。

---

## 🚀 快速启动与运维指南

### 1. 本地启动

```bash
# 启动服务（默认端口 3000，或自定义 PORT=3001 ./start.sh）
./start.sh

# 停止服务
./stop.sh
```

或使用 npm 原生脚本：
```bash
npm start
```

### 2. 多环境运行与 Multica 环境托管

项目已配置 `.multica/environments.toml`，在 Multica 平台中可通过以下命令一键拉起托管实例：

```bash
multica env start app
```
- 查看环境状态：`multica env list`
- 停止运行环境：`multica env stop app`

### 3. Docker 容器化部署

```bash
# Docker 镜像构建并运行
docker build -t ai-calorie-tracker:latest .
docker run -d -p 3000:3000 --name calorie-tracker ai-calorie-tracker:latest

# 或使用 docker-compose 一键编排
docker compose up -d
```

---

## 🔍 健康检查与自动化检测

### 探针接口说明
- **Endpoint**: `GET /health` 或 `GET /api/health`
- **响应示例**:
  ```json
  {
    "status": "UP",
    "timestamp": "2026-11-22T10:37:28.725Z",
    "uptime": 4.47,
    "service": "ai-calorie-tracker",
    "version": "1.0.0"
  }
  ```

### 自动化测试验证
```bash
# 运行单元测试与端到端质量验收测试（36 passed）
npm test
```
