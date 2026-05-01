#!/usr/bin/env bash
# 服务器端部署脚本 — GitHub Actions 通过 SSH 调用, 也能 SSH 进去手动跑
# 用法 (在服务器): cd /opt/edu-solver && bash scripts/deploy.sh

set -euo pipefail
trap 'echo "❌ Deploy failed at line $LINENO"; exit 1' ERR

cd /opt/edu-solver

echo "════════════════════════════════════════"
echo "🚀 Deploy started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════"

# 1. 拉最新代码
echo ""
echo "📥 [1/4] git pull origin main"
git pull origin main

# 2. 装依赖 (npm ci 比 install 严格 + 快, 用 lock 文件)
echo ""
echo "📦 [2/4] npm ci"
npm ci --no-audit --no-fund

# 3. build
echo ""
echo "🔨 [3/4] npm run build"
npm run build

# 4. 重启容器 (volume mount 模式下, build 产物自动同步, 重启即生效)
echo ""
echo "🔄 [4/4] docker restart edu-solver"
docker restart edu-solver

# 5. health check (最多等 30 秒)
echo ""
echo "🩺 Health check..."
for i in $(seq 1 15); do
    if curl -fsS --max-time 3 http://127.0.0.1:3000 > /dev/null 2>&1; then
        echo "✅ App is healthy (took ${i}x2s)"
        break
    fi
    if [ "$i" -eq 15 ]; then
        echo "❌ Health check failed after 30s. Last logs:"
        docker logs --tail 20 edu-solver
        exit 1
    fi
    echo "  waiting... ($i/15)"
    sleep 2
done

echo ""
echo "════════════════════════════════════════"
echo "✅ Deploy completed: $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════"
