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
echo "📥 [1/5] git pull origin main"
git pull origin main

# 2. 装依赖
echo ""
echo "📦 [2/5] npm ci"
npm ci --no-audit --no-fund

# 3. build
echo ""
echo "🔨 [3/5] npm run build"
npm run build

# 4. 重启 edu-solver 容器 (volume mount 模式下, build 产物自动同步)
echo ""
echo "🔄 [4/5] docker restart edu-solver"
docker restart edu-solver

# 5. 维护 caddy site config + reload caddy
#    GEO 项目共享 /opt/caddy-sites/, 我们的 edu-solver.caddy 在这里
#    每次 edu-solver 部署都重写, 防止 sites 目录被误改
echo ""
echo "🌐 [5/5] 维护 caddy site config + reload"
mkdir -p /opt/caddy-sites
cat > /opt/caddy-sites/edu-solver.caddy <<'CADDY_EOF'
solver.riverstonedevs.com {
    encode zstd gzip
    reverse_proxy edu-solver:3000
}
CADDY_EOF

# 触发 caddy reload (热更新, 不重启容器)
if docker exec georiver-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null; then
    echo "  ✓ caddy reloaded (零中断)"
else
    echo "  ⚠️  caddy reload 失败, fallback 到 restart"
    cd /opt/georiverstone && docker compose up -d caddy
    cd /opt/edu-solver
fi

# 6. health check (最多等 30 秒)
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
