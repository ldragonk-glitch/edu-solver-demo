import { anthropic, MODEL } from "@/lib/anthropic";
import { solveTool } from "@/lib/solveSchema";
import { SYSTEM_PROMPT } from "@/lib/prompts";
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

    return NextResponse.json({
      html: result.html,
      summary: result.summary,
      usage: response.usage,
      model: response.model,
      stop_reason: response.stop_reason,
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
