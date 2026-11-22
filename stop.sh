#!/usr/bin/env bash
PORT="${PORT:-3000}"
echo "🛑 停止监听端口 $PORT 的服务..."
PIDS=$(lsof -ti :$PORT || true)
if [ -n "$PIDS" ]; then
  kill -15 $PIDS 2>/dev/null || kill -9 $PIDS 2>/dev/null
  echo "✅ 已成功停止 PID: $PIDS"
else
  echo "ℹ️ 端口 $PORT 上未发现运行中的进程"
fi
