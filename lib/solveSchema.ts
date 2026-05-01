import type Anthropic from "@anthropic-ai/sdk";

// 极简 schema: Claude 直接输出一个完整的 HTML 页面字符串.
// 不约束内部结构, Claude 自己决定怎么解、用什么可视化、什么风格.
// 前端拿到 html 后丢进 iframe srcdoc 沙箱渲染.

export const solveTool: Anthropic.Tool = {
  name: "render_solution",
  description:
    "针对用户拍摄的题目, 生成一个完整的 self-contained HTML 解题页面",
  input_schema: {
    type: "object",
    properties: {
      html: {
        type: "string",
        description:
          "完整的 HTML 页面字符串, 必须以 <!DOCTYPE html> 开头, 包含 React + Tailwind from CDN, 内含一个完整的解题 React App",
      },
      summary: {
        type: "string",
        description:
          "一句中文话简述这道题是什么 (例如 '求解 2x+3=7' 或 '化学计算 Fe2O3 + KOH 反应'), 给前端列表用",
      },
    },
    required: ["html"],
  },
};
