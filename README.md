# AI 解题 Demo

拍一张数学题, AI 自动一步步讲解.

## 跑起来 (3 步)

### 1. 装依赖

```bash
cd D:/edu-solver-demo
npm install
```

### 2. 配 API key

```bash
cp .env.local.example .env.local
```

然后编辑 `.env.local`, 填入你的 Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

### 3. 启动

本机访问:

```bash
npm run dev
```

打开 http://localhost:3000

**手机访问 (投资人 demo 必看)**:

```bash
npm run dev:lan
```

然后:
1. 找到本机局域网 IP (Windows 在 PowerShell 里跑 `ipconfig`, 看 `IPv4 地址`, 假设是 `192.168.1.10`)
2. 确保电脑和手机连同一个 WiFi
3. 手机浏览器打开 `http://192.168.1.10:3000`
4. iOS Safari 可以"添加到主屏幕", 看起来就是个 native app

---

## 架构

```
手机浏览器
   ↓ POST /api/solve { image: base64, mediaType }
Next.js API Route (本机 or Vercel)
   ↓ Anthropic SDK, tool_use 强制 JSON schema
Claude Sonnet 4.6 (默认, 可改 .env 切到 Opus)
   ↓ 返回 { solution: { problem, steps, final_answer } }
React 渲染器 (KaTeX 公式 + Framer Motion 动画)
```

## 输出 DSL 示例

不让 LLM 直出 JSX 字符串, 而是用 **Anthropic tool_use 绑定 JSON schema**, 模型必须按 schema 输出. 客户端再把 JSON 映射成组件, 杜绝语法错.

```json
{
  "problem": "解方程 2x + 3 = 7",
  "subject": "algebra",
  "steps": [
    {
      "narration": "把常数项移到等号右边",
      "blocks": [
        { "type": "equation", "latex": "2x + 3 = 7" },
        { "type": "equation", "latex": "2x = 7 - 3", "highlight": "- 3" }
      ]
    },
    {
      "narration": "两边同除以 2",
      "blocks": [
        { "type": "equation", "latex": "x = \\frac{4}{2}" },
        { "type": "equation", "latex": "x = 2" }
      ]
    }
  ],
  "final_answer": "x = 2"
}
```

## 切换模型

默认用 `claude-sonnet-4-6` (视觉理解 + 解题足够, 比 Opus 便宜 5 倍且快一倍).

要换模型, 编辑 `.env.local`:

```
ANTHROPIC_MODEL=claude-opus-4-6
```

## 隐藏模型对比

访问 `/?models=1` 会出现调试用模型切换, 可手动选择 Claude / GLM / Kimi 对同一拍照流程做效果对比。普通 `/` 不显示开关, 默认仍走 Claude。

`.env.local` 里按需补充:

```
BIGMODEL_API_KEY=你的智谱key
MOONSHOT_API_KEY=你的Kimi key
```

## 文件结构

```
edu-solver-demo/
├── app/
│   ├── api/solve/route.ts    # 调 Claude API 的核心路由
│   ├── page.tsx              # 主页 (拍照 + 显示解答)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── PhotoCapture.tsx      # 拍照 / 上传按钮
│   ├── SolutionView.tsx      # 解答整体布局
│   ├── StepBlock.tsx         # 单个解题步骤
│   └── EquationBlock.tsx     # KaTeX 公式 + 高亮
├── lib/
│   ├── anthropic.ts          # Claude client
│   ├── solveSchema.ts        # tool_use JSON schema
│   └── prompts.ts            # 系统提示词
└── types/
    └── solution.ts           # DSL 的 TypeScript 类型
```

## 投资人 demo 现场剧本

1. 掏出手机, 让投资人看你扫二维码访问 (二维码可以 [qr-code-generator.com](https://www.qr-code-generator.com/) 生成, 输入 LAN URL)
2. 现场翻一本数学书或打印题, 拍一张
3. 5–15 秒后看到一步步动画讲解
4. 说一句: "这是 Claude 4.6 直接读图 + 输出结构化 JSON, 我们前端按 schema 渲染. JSX 卡视频上太重, 我们这套 DSL 几 KB, 中国到新加坡 80ms, 加全球加速能压到 60ms."

## 后续路线 (PPT 用)

- V1.1: 流式输出 (按步骤逐步出现, 不等全部生成完)
- V1.2: 几何画板组件 (`<GeometryBoard>` + SVG)
- V2: 多轮追问 ("这一步我没看懂, 再讲讲")
- V2: 题型扩展 (物理/化学)
- V3: 跨境合规闭环 (新加坡后端 + 国内 ICP 域名 + 全球加速专线)
