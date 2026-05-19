import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDataImageUrl,
  buildOpenAIChatParams,
  getOpenAIProviderConfig,
  getDefaultProvider,
  isModelProvider,
  parseOpenAIToolArguments,
  resolveRequestedProvider,
  toOpenAITool,
} from "../lib/modelProviders";
import { solveTool } from "../lib/solveSchema";

test("recognizes only supported model providers", () => {
  assert.equal(isModelProvider("claude"), true);
  assert.equal(isModelProvider("glm"), true);
  assert.equal(isModelProvider("kimi"), true);
  assert.equal(isModelProvider("minimax"), false);
  assert.equal(isModelProvider(undefined), false);
});

test("defaults to claude when env default is missing or invalid", () => {
  assert.equal(getDefaultProvider(undefined), "claude");
  assert.equal(getDefaultProvider("minimax"), "claude");
  assert.equal(getDefaultProvider("kimi"), "kimi");
});

test("resolves request provider from explicit value or default", () => {
  assert.deepEqual(resolveRequestedProvider(undefined, "glm"), {
    ok: true,
    provider: "glm",
  });
  assert.deepEqual(resolveRequestedProvider("kimi", "glm"), {
    ok: true,
    provider: "kimi",
  });
  assert.deepEqual(resolveRequestedProvider("minimax", "claude"), {
    ok: false,
    error: "不支持的 provider: minimax",
  });
});

test("builds data image URLs for OpenAI-compatible vision requests", () => {
  assert.equal(
    buildDataImageUrl("image/png", "abc123"),
    "data:image/png;base64,abc123",
  );
});

test("converts the Anthropic tool schema into an OpenAI function tool", () => {
  const tool = toOpenAITool(solveTool);

  assert.equal(tool.type, "function");
  if (tool.type !== "function") {
    assert.fail("Expected function tool");
  }
  assert.equal(tool.function.name, "render_solution");
  assert.equal(tool.function.parameters, solveTool.input_schema);
});

test("parses OpenAI-compatible tool call arguments", () => {
  const result = parseOpenAIToolArguments([
    {
      id: "call_1",
      type: "function",
      function: {
        name: "render_solution",
        arguments: JSON.stringify({
          html: "<!DOCTYPE html><html><body>ok</body></html>",
          summary: "测试题",
        }),
      },
    },
  ]);

  assert.deepEqual(result, {
    html: "<!DOCTYPE html><html><body>ok</body></html>",
    summary: "测试题",
  });
});

test("rejects missing OpenAI-compatible tool calls", () => {
  assert.throws(
    () => parseOpenAIToolArguments(undefined),
    /模型未返回 render_solution 工具调用/,
  );
});

test("rejects tool arguments without html", () => {
  assert.throws(
    () =>
      parseOpenAIToolArguments([
        {
          id: "call_1",
          type: "function",
          function: {
            name: "render_solution",
            arguments: JSON.stringify({ summary: "没有 html" }),
          },
        },
      ]),
    /模型未返回 html 字符串/,
  );
});

test("builds BigModel provider config from env", () => {
  assert.deepEqual(
    getOpenAIProviderConfig("glm", {
      BIGMODEL_API_KEY: "glm-key",
    }),
    {
      apiKey: "glm-key",
      baseURL: "https://open.bigmodel.cn/api/paas/v4",
      model: "glm-5v-turbo",
    },
  );
});

test("builds Kimi provider config from env", () => {
  assert.deepEqual(
    getOpenAIProviderConfig("kimi", {
      MOONSHOT_API_KEY: "kimi-key",
    }),
    {
      apiKey: "kimi-key",
      baseURL: "https://api.moonshot.cn/v1",
      model: "kimi-k2.6",
    },
  );
});

test("requires provider-specific API keys", () => {
  assert.throws(
    () => getOpenAIProviderConfig("glm", {}),
    /BIGMODEL_API_KEY 未配置/,
  );
  assert.throws(
    () => getOpenAIProviderConfig("kimi", {}),
    /MOONSHOT_API_KEY 未配置/,
  );
});

test("builds an OpenAI-compatible vision request for GLM", () => {
  const params = buildOpenAIChatParams({
    model: "glm-5v-turbo",
    systemPrompt: "same prompt",
    tool: solveTool,
    image: "abc123",
    mediaType: "image/png",
  });

  assert.equal(params.model, "glm-5v-turbo");
  assert.equal(params.tool_choice, "required");
  assert.equal(params.tools?.[0].type, "function");
  if (params.tools?.[0].type !== "function") {
    assert.fail("Expected function tool");
  }
  assert.equal(params.tools?.[0].function.name, "render_solution");
  assert.deepEqual(params.messages[0], {
    role: "system",
    content: "same prompt",
  });
  assert.deepEqual(params.messages[1], {
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: { url: "data:image/png;base64,abc123" },
      },
      {
        type: "text",
        text: "请解答图片里这道题, 生成完整的 HTML 解题页面.",
      },
    ],
  });
});

test("builds a Kimi request with thinking disabled", () => {
  const params = buildOpenAIChatParams({
    provider: "kimi",
    model: "kimi-k2.6",
    systemPrompt: "same prompt",
    tool: solveTool,
    text: "2x + 3 = 7",
  });

  assert.equal(params.model, "kimi-k2.6");
  assert.equal(params.tool_choice, "required");
  assert.deepEqual((params as { thinking?: unknown }).thinking, {
    type: "disabled",
  });
});
