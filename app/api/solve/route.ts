import { anthropic, MODEL } from "@/lib/anthropic";
import { solveTool } from "@/lib/solveSchema";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { computeCostUsd, logUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

export const maxDuration = 120;
export const runtime = "nodejs";

type ReqBody = {
  image?: string; // base64, 不带 data url 前缀
  mediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  text?: string; // 备选: 纯文本题目
};

type SolveResult = {
  html: string;
  summary?: string;
};

export async function POST(req: Request) {
  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const { image, mediaType, text } = body;

  if (!image && !text) {
    return NextResponse.json(
      { error: "需要提供 image (base64) 或 text (题目文字)" },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "服务端未配置 ANTHROPIC_API_KEY, 请检查 .env.local" },
      { status: 500 },
    );
  }

  // 构造 user message
  const userContent = [
    ...(image
      ? [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType || ("image/jpeg" as const),
              data: image,
            },
          },
        ]
      : []),
    {
      type: "text" as const,
      text: text
        ? `请解答这道题:\n\n${text}`
        : "请解答图片里这道题, 生成完整的 HTML 解题页面.",
    },
  ];

  const t0 = Date.now();
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      // 让 Claude 输出整个 HTML 页面, 通常 6-12k tokens
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [solveTool],
      tool_choice: { type: "tool", name: "render_solution" },
      messages: [{ role: "user", content: userContent }],
    });
    const latency_ms = Date.now() - t0;

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "模型未返回结构化结果, 请重试" },
        { status: 502 },
      );
    }

    const result = toolUse.input as SolveResult;
    if (!result.html || typeof result.html !== "string") {
      return NextResponse.json(
        { error: "模型未返回 html 字符串, 请重试" },
        { status: 502 },
      );
    }

    // 算成本 + 写日志 (失败不阻塞主流程)
    const cache_creation =
      (response.usage as { cache_creation_input_tokens?: number })
        .cache_creation_input_tokens || 0;
    const cache_read =
      (response.usage as { cache_read_input_tokens?: number })
        .cache_read_input_tokens || 0;
    const cost_usd = computeCostUsd(
      response.model,
      response.usage.input_tokens,
      response.usage.output_tokens,
      cache_creation,
      cache_read,
    );
    void logUsage({
      ts: new Date().toISOString(),
      model: response.model,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: cache_creation,
      cache_read_input_tokens: cache_read,
      cost_usd,
      latency_ms,
      stop_reason: response.stop_reason || undefined,
    });

    return NextResponse.json({
      html: result.html,
      summary: result.summary,
      usage: response.usage,
      model: response.model,
      stop_reason: response.stop_reason,
      cost_usd,
      latency_ms,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    console.error("[solve] error:", err);
    return NextResponse.json(
      { error: `调用 Claude 失败: ${message}` },
      { status: 500 },
    );
  }
}
