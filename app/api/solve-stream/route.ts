import { anthropic, MODEL } from "@/lib/anthropic";
import { STREAM_SYSTEM_PROMPT } from "@/lib/prompts";
import { computeCostUsd, logUsage } from "@/lib/usage";

export const maxDuration = 120;
export const runtime = "nodejs";

type ReqBody = {
  image?: string;
  mediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  text?: string;
};

/**
 * 从流式文本中解析 ---TAG--- ... ---END--- 分隔的 JSON 块.
 * 每找到一个完整块, 调用 onBlock 回调.
 */
function createBlockParser(
  onBlock: (tag: string, json: Record<string, unknown>) => void,
) {
  let buffer = "";

  return {
    feed(chunk: string) {
      buffer += chunk;

      // 反复查找完整的 ---TAG---...---END--- 块
      while (true) {
        const startMatch = buffer.match(/---(\w+)---\s*\n?/);
        if (!startMatch) break;

        const tag = startMatch[1];
        const contentStart = startMatch.index! + startMatch[0].length;

        const endMarker = "---END---";
        const endIdx = buffer.indexOf(endMarker, contentStart);
        if (endIdx === -1) break; // 块还没完整, 等更多数据

        const jsonStr = buffer.slice(contentStart, endIdx).trim();
        // 消费掉已处理的部分
        buffer = buffer.slice(endIdx + endMarker.length);

        try {
          const parsed = JSON.parse(jsonStr);
          onBlock(tag, parsed);
        } catch {
          // JSON 解析失败, 跳过 (可能是格式异常)
          console.warn(`[solve-stream] failed to parse ${tag} block:`, jsonStr.slice(0, 200));
        }
      }
    },
  };
}

export async function POST(req: Request): Promise<Response> {
  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "请求体不是合法 JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { image, mediaType, text } = body;

  if (!image && !text) {
    return new Response(
      JSON.stringify({ error: "需要提供 image (base64) 或 text (题目文字)" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "服务端未配置 ANTHROPIC_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

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
      text: text ? `请解答这道题:\n\n${text}` : "请解答图片里这道题.",
    },
  ];

  const encoder = new TextEncoder();
  const t0 = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 8192,
          system: STREAM_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        });

        let stepIndex = 0;

        const parser = createBlockParser((tag, json) => {
          switch (tag) {
            case "META":
              send({
                type: "meta",
                summary: json.summary,
                subject: json.subject,
                problem: json.problem,
              });
              break;

            case "STEP":
              send({ type: "step", index: stepIndex, step: json });
              stepIndex++;
              break;

            case "ANSWER":
              // answer 先暂存, 等 done 一起发
              answerPayload = json;
              break;
          }
        });

        let answerPayload: Record<string, unknown> | null = null;

        // 监听流式 text 事件 — 每个文本 delta 立即解析
        anthropicStream.on("text", (textDelta: string) => {
          parser.feed(textDelta);
        });

        // 等待流完成
        const finalMessage = await anthropicStream.finalMessage();
        const latency_ms = Date.now() - t0;

        // 发送 done 事件
        const cache_creation =
          (finalMessage.usage as { cache_creation_input_tokens?: number })
            .cache_creation_input_tokens || 0;
        const cache_read =
          (finalMessage.usage as { cache_read_input_tokens?: number })
            .cache_read_input_tokens || 0;
        const cost_usd = computeCostUsd(
          finalMessage.model,
          finalMessage.usage.input_tokens,
          finalMessage.usage.output_tokens,
          cache_creation,
          cache_read,
        );

        send({
          type: "done",
          answer: answerPayload,
          usage: finalMessage.usage,
          model: finalMessage.model,
          cost_usd,
          latency_ms,
        });

        // 写日志 (不阻塞)
        void logUsage({
          ts: new Date().toISOString(),
          model: finalMessage.model,
          input_tokens: finalMessage.usage.input_tokens,
          output_tokens: finalMessage.usage.output_tokens,
          cache_creation_input_tokens: cache_creation,
          cache_read_input_tokens: cache_read,
          cost_usd,
          latency_ms,
          stop_reason: finalMessage.stop_reason || undefined,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "未知错误";
        console.error("[solve-stream] error:", err);
        send({ type: "error", message: `调用 Claude 失败: ${message}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
