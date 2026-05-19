import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";

export const MODEL_PROVIDERS = ["claude", "glm", "kimi"] as const;

export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

export type SolveResult = {
  html: string;
  summary?: string;
};

export type OpenAIModelProvider = Exclude<ModelProvider, "claude">;

export type OpenAIProviderConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
};

export type OpenAIChatParams =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    thinking?: { type: "disabled" };
  };

type OpenAIToolCall = NonNullable<
  OpenAI.Chat.Completions.ChatCompletionMessage["tool_calls"]
>[number];
type OpenAIFunctionToolCall = Extract<OpenAIToolCall, { type: "function" }>;

export function isModelProvider(value: unknown): value is ModelProvider {
  return (
    typeof value === "string" &&
    MODEL_PROVIDERS.includes(value as ModelProvider)
  );
}

export function getDefaultProvider(
  value = process.env.MODEL_PROVIDER_DEFAULT,
): ModelProvider {
  return isModelProvider(value) ? value : "claude";
}

export function resolveRequestedProvider(
  requested: unknown,
  fallback: ModelProvider = getDefaultProvider(),
):
  | { ok: true; provider: ModelProvider }
  | { ok: false; error: string } {
  if (requested == null || requested === "") {
    return { ok: true, provider: fallback };
  }
  if (!isModelProvider(requested)) {
    return { ok: false, error: `不支持的 provider: ${String(requested)}` };
  }
  return { ok: true, provider: requested };
}

export function buildDataImageUrl(mediaType: string, image: string): string {
  return `data:${mediaType};base64,${image}`;
}

export function getOpenAIProviderConfig(
  provider: OpenAIModelProvider,
  env: Partial<NodeJS.ProcessEnv> = process.env,
): OpenAIProviderConfig {
  if (provider === "glm") {
    const apiKey = env.BIGMODEL_API_KEY;
    if (!apiKey) {
      throw new Error("BIGMODEL_API_KEY 未配置");
    }
    return {
      apiKey,
      baseURL:
        env.BIGMODEL_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
      model: env.BIGMODEL_MODEL || "glm-5v-turbo",
    };
  }

  const apiKey = env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("MOONSHOT_API_KEY 未配置");
  }
  return {
    apiKey,
    baseURL: env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1",
    model: env.KIMI_MODEL || "kimi-k2.6",
  };
}

export function toOpenAITool(
  tool: Anthropic.Tool,
): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  };
}

export function buildOpenAIChatParams({
  provider = "glm",
  model,
  systemPrompt,
  tool,
  image,
  mediaType,
  text,
}: {
  provider?: OpenAIModelProvider;
  model: string;
  systemPrompt: string;
  tool: Anthropic.Tool;
  image?: string;
  mediaType?: string;
  text?: string;
}): OpenAIChatParams {
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    ...(image
      ? [
          {
            type: "image_url" as const,
            image_url: {
              url: buildDataImageUrl(mediaType || "image/jpeg", image),
            },
          },
        ]
      : []),
    {
      type: "text",
      text: text
        ? `请解答这道题:\n\n${text}`
        : "请解答图片里这道题, 生成完整的 HTML 解题页面.",
    },
  ];

  const params: OpenAIChatParams = {
    model,
    max_tokens: 16000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [toOpenAITool(tool)],
    tool_choice: "required",
  };

  if (provider === "kimi") {
    params.thinking = { type: "disabled" };
  }

  return params;
}

export function parseOpenAIToolArguments(
  toolCalls: OpenAIToolCall[] | undefined,
): SolveResult {
  const toolCall = toolCalls
    ?.filter(isOpenAIFunctionToolCall)
    .find((call) => call.function.name === "render_solution");
  if (!toolCall) {
    throw new Error("模型未返回 render_solution 工具调用, 请重试");
  }

  let parsed: unknown;
  try {
    parsed =
      typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
  } catch {
    throw new Error("模型返回的工具参数不是合法 JSON, 请重试");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("模型返回的工具参数不是对象, 请重试");
  }

  const result = parsed as Partial<SolveResult>;
  if (!result.html || typeof result.html !== "string") {
    throw new Error("模型未返回 html 字符串, 请重试");
  }

  return {
    html: result.html,
    summary: typeof result.summary === "string" ? result.summary : undefined,
  };
}

function isOpenAIFunctionToolCall(
  call: OpenAIToolCall,
): call is OpenAIFunctionToolCall {
  return call.type === "function";
}
