import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

// 数据目录: 容器内 /app/data 等于宿主机 /opt/edu-solver/data (volume mount)
// 文件 usage.jsonl 是 append-only 日志, 每行一条 JSON
const DATA_DIR =
  process.env.NODE_ENV === "production" ? "/app/data" : "./data";

const USAGE_FILE = path.join(DATA_DIR, "usage.jsonl");

// 定价表 (USD per 1M tokens, 来自 anthropic.com/pricing)
// 注意: cache_creation 比 input 贵 25%, cache_read 比 input 便宜 90%
const PRICING_USD_PER_M: Record<
  string,
  { input: number; output: number; cache_write: number; cache_read: number }
> = {
  "claude-sonnet-4-5": {
    input: 3,
    output: 15,
    cache_write: 3.75,
    cache_read: 0.3,
  },
  "claude-opus-4-5": {
    input: 15,
    output: 75,
    cache_write: 18.75,
    cache_read: 1.5,
  },
  "claude-haiku-4-5": {
    input: 1,
    output: 5,
    cache_write: 1.25,
    cache_read: 0.1,
  },
  // 旧版兼容
  "claude-sonnet-4-5-20250929": {
    input: 3,
    output: 15,
    cache_write: 3.75,
    cache_read: 0.3,
  },
};

export interface UsageEntry {
  ts: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  cost_usd: number;
  latency_ms: number;
  stop_reason?: string;
}

function getPricing(model: string) {
  // 找完全匹配, 或前缀匹配 (例如 claude-sonnet-4-5-* 都算 sonnet-4-5)
  if (PRICING_USD_PER_M[model]) return PRICING_USD_PER_M[model];
  for (const [key, value] of Object.entries(PRICING_USD_PER_M)) {
    if (model.startsWith(key)) return value;
  }
  // 默认按 sonnet-4-5 算
  return PRICING_USD_PER_M["claude-sonnet-4-5"];
}

export function computeCostUsd(
  model: string,
  input_tokens: number,
  output_tokens: number,
  cache_creation_input_tokens = 0,
  cache_read_input_tokens = 0,
): number {
  const p = getPricing(model);
  return (
    (input_tokens / 1_000_000) * p.input +
    (output_tokens / 1_000_000) * p.output +
    (cache_creation_input_tokens / 1_000_000) * p.cache_write +
    (cache_read_input_tokens / 1_000_000) * p.cache_read
  );
}

export async function logUsage(entry: UsageEntry): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(USAGE_FILE, JSON.stringify(entry) + "\n", "utf-8");
  } catch (e) {
    // 日志失败不能阻塞主流程, 只 console
    console.error("[usage] failed to log:", e);
  }
}

export async function readUsageEntries(): Promise<UsageEntry[]> {
  try {
    const content = await readFile(USAGE_FILE, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as UsageEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is UsageEntry => e !== null);
  } catch {
    return [];
  }
}
