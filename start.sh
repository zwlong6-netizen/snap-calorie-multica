#!/usr/bin/env bash
set -e

PORT="${PORT:-3000}"
echo "🚀 启动 AI 卡路里拍照识别与摄入管理服务..."
echo "端口: $PORT"

if [ -f .env ]; then
  echo "加载环境变量 .env"
  export $(grep -v '^#' .env | xargs)
fi

PORT=$PORT node server/index.js
