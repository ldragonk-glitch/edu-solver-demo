# 部署到 Vercel + 手机加到主屏幕

10 分钟搞定。投资人扫码就能用。

---

## 第一步: 推到 GitHub (3 分钟)

如果你还没把代码推到 GitHub:

### A. 在 GitHub 建 repo

1. 打开 https://github.com/new
2. Repository name: `edu-solver-demo` (随便起)
3. **Private** (不要 public, 里面有 API key 的痕迹)
4. 不要勾 "Add a README"
5. 点 **Create repository**

### B. 本地推上去

在 `D:\edu-solver-demo\` 文件夹里, 右键 → "在终端中打开" (或者打开 PowerShell `cd D:\edu-solver-demo`).

第一次推:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<你的用户名>/edu-solver-demo.git
git push -u origin main
```

> 推不上去? 通常是没装 git, 去 https://git-scm.com/download/win 装一下. 或者用 GitHub Desktop 图形界面 (https://desktop.github.com/) 更简单.

> ⚠️ `.env.local` 已经在 `.gitignore` 里, **不会被推上去** (好事, API key 不进 git).

---

## 第二步: Vercel 部署 (3 分钟)

1. 打开 https://vercel.com, 用 GitHub 账号登录
2. 仪表盘点 **Add New** → **Project**
3. 选刚才的 repo `edu-solver-demo` → **Import**
4. **关键: 加环境变量**
   - 在 "Environment Variables" 区, 加一条:
     - Name: `ANTHROPIC_API_KEY`
     - Value: 你的 sk-ant-... key (从 .env.local 复制)
   - 三个环境 (Production / Preview / Development) 都勾上
5. **Framework Preset** Vercel 会自动识别 Next.js, 不用改
6. 点 **Deploy**

2 分钟后构建完成, Vercel 给你一个 URL, 例如:

```
https://edu-solver-demo-xyz.vercel.app
```

打开这个 URL 测一下能不能拍照解题. **手机摄像头需要 HTTPS, Vercel 自动给 HTTPS, 完美**.

---

## 第三步: 手机加到主屏幕 (2 分钟)

### iOS (iPhone / iPad)

1. **必须用 Safari** (Chrome 在 iOS 不支持加到主屏幕)
2. 打开你的 Vercel URL
3. 底部分享按钮 (方框上箭头那个图标)
4. 滚动找 **"添加到主屏幕"** → 改名 (可选) → 添加
5. 主屏幕出现 **AI Solver** 图标 (橙紫渐变 Σ)
6. 点开 → **全屏无地址栏, 跟原生 app 一样**

### Android

1. Chrome 打开你的 Vercel URL
2. 右上角三点菜单
3. 点 **"安装应用"** (有些版本叫"添加到主屏幕")
4. 抽屉里出现 AI Solver 图标
5. 点开 → 独立 app 风格运行

---

## 给投资人 demo 怎么打开

**方案一: 二维码** (推荐)

1. 打开 https://www.qr-code-generator.com/
2. 输入你的 Vercel URL
3. 下载二维码图片
4. 投资人手机扫码 → 直接打开
5. 让他自己 "添加到主屏幕" 体验完整 app 感觉

**方案二: 直接发链接**

微信发 URL, 但: 微信内置浏览器很多功能受限 (摄像头有时不行, 加到主屏幕不能用). 让投资人**复制链接, 用 Safari/Chrome 打开**.

---

## 部署后的更新

代码改了想发版?

```bash
git add .
git commit -m "update"
git push
```

Vercel 监听 git push, 自动重新构建部署. 1-2 分钟后新版上线.

---

## 故障排查

### 问: 手机访问 Vercel URL 拍照不工作?

- 检查是否走 HTTPS (Vercel URL 默认是)
- iOS Safari 第一次拍照会问权限, 必须点允许
- 不要用微信内置浏览器 (摄像头权限受限)

### 问: 部署后 /api/solve 返回 401?

环境变量 `ANTHROPIC_API_KEY` 没设对.
- Vercel 项目控制台 → Settings → Environment Variables
- 确认 key 拼对, 没有前后空格
- 改了之后要 Redeploy (Deployments tab 找最新一次, 点右边 ... → Redeploy)

### 问: 想换图标?

1. 改 `public/icon.svg` (主图) 和 `public/icon-maskable-src.svg` (内圈安全区版)
2. 跑 `npm run gen-icons`
3. `git add . && git commit -m "update icon" && git push`
4. Vercel 自动重新部署
5. 手机上**先把旧图标从主屏移除**再重新加 (浏览器会缓存旧图标)

### 问: Vercel 免费版够用吗?

够 demo 用. 限制:
- Function 调用: 每月 100k 次 (你不会撞)
- Bandwidth: 100GB/月
- Function 执行时间: 最长 10 秒 (Hobby) / 60 秒 (Pro)
- ⚠️ **关键**: Claude 调用通常 15-40 秒, **Hobby 计划的 10 秒 timeout 会把请求 cut 掉**.
- 解法 1: 升级 Vercel Pro ($20/月), function timeout 60 秒
- 解法 2: 用 Cloudflare Workers / 自己 VPS 跑后端
- 解法 3: 切回 Sonnet 4.5 默认快模型 (一般 < 10 秒)

> ⚠️ 这是真实坑. Hobby 部署后第一次拍复杂题大概率会 timeout. 投资人 demo 当晚就升 Pro, $20 解决.

---

## 下一步 (demo 之后想做)

- 把 demo URL 自定义域名 (Vercel Settings → Domains, 接你买的域名)
- 加 Google Analytics / Vercel Analytics 看用户行为
- 做用户登录 (Clerk / NextAuth)
- 加题目缓存 (避免同一道题重复调 Claude)
- 用 Capacitor 套壳上 App Store (见主对话方案 B)
