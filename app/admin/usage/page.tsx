import { readUsageEntries, type UsageEntry } from "@/lib/usage";

// 强制服务器渲染, 每次访问都读最新文件
export const dynamic = "force-dynamic";

// 美元 → 人民币 (粗略, 看大致数量级)
const USD_TO_CNY = 7.2;

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  // 简单密码保护: env 设了 ADMIN_PASSWORD 就需要 ?p=xxx 才能看
  const params = await searchParams;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && params.p !== adminPassword) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 360,
            textAlign: "center",
            padding: 28,
            border: "1px solid rgba(148, 163, 184, 0.2)",
            borderRadius: 16,
            background: "#0f172a",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <div
            style={{
              fontSize: 14,
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            需要管理员密码
            <br />
            在 URL 后加 <code style={{ color: "#fbbf24" }}>?p=你的密码</code>
          </div>
        </div>
      </main>
    );
  }

  const entries = await readUsageEntries();

  // 总体统计
  const totalCalls = entries.length;
  const totalInput = sum(entries, (e) => e.input_tokens);
  const totalOutput = sum(entries, (e) => e.output_tokens);
  const totalCacheCreate = sum(
    entries,
    (e) => e.cache_creation_input_tokens || 0,
  );
  const totalCacheRead = sum(entries, (e) => e.cache_read_input_tokens || 0);
  const totalCostUsd = sum(entries, (e) => e.cost_usd);
  const avgCostUsd = totalCalls > 0 ? totalCostUsd / totalCalls : 0;
  const avgLatencyMs =
    totalCalls > 0 ? sum(entries, (e) => e.latency_ms) / totalCalls : 0;

  // 按日期分组
  const byDate = groupByDate(entries);

  // 最近 30 次
  const recent = entries.slice(-30).reverse();

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, rgba(168, 85, 247, 0.12), transparent 50%), #020617",
        color: "#e2e8f0",
        padding: "24px 16px 60px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              color: "#fbbf24",
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            ADMIN
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              margin: 0,
              background:
                "linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            📊 API Usage Dashboard
          </h1>
          <div
            style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}
          >
            实时读取 /opt/edu-solver/data/usage.jsonl, 每次调 /api/solve 自动追加
          </div>
        </header>

        {/* 顶部 KPI 卡片 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <Kpi
            title="Total calls"
            value={totalCalls.toLocaleString()}
          />
          <Kpi
            title="Avg latency"
            value={`${(avgLatencyMs / 1000).toFixed(1)} s`}
          />
          <Kpi
            title="Total tokens"
            value={fmtTokens(totalInput + totalOutput)}
            subtitle={`in ${fmtTokens(totalInput)} / out ${fmtTokens(totalOutput)}`}
          />
          <Kpi
            title="Total cost"
            value={`$${totalCostUsd.toFixed(2)}`}
            subtitle={`≈ ¥${(totalCostUsd * USD_TO_CNY).toFixed(2)}`}
            highlight
          />
          <Kpi
            title="Avg / call"
            value={`$${avgCostUsd.toFixed(4)}`}
            subtitle={`≈ ¥${(avgCostUsd * USD_TO_CNY).toFixed(3)}`}
          />
          {totalCacheRead + totalCacheCreate > 0 && (
            <Kpi
              title="Cache savings"
              value={fmtTokens(totalCacheRead)}
              subtitle={`read 90% off`}
            />
          )}
        </div>

        {/* 按日期 */}
        {byDate.length > 0 && (
          <Section title="By date">
            <Table
              cols={[
                { label: "Date", align: "left" },
                { label: "Calls", align: "right" },
                { label: "Tokens", align: "right" },
                { label: "Cost", align: "right" },
                { label: "Avg / call", align: "right" },
              ]}
              rows={byDate.map(
                ({ date, calls, tokens, cost }) => ({
                  key: date,
                  cells: [
                    date,
                    calls.toLocaleString(),
                    fmtTokens(tokens),
                    `$${cost.toFixed(3)}`,
                    `$${(cost / calls).toFixed(4)}`,
                  ],
                }),
              )}
            />
          </Section>
        )}

        {/* 最近调用 */}
        <Section title={`Recent ${recent.length} calls`}>
          {recent.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#64748b",
              }}
            >
              没有数据。拍一道题就有了。
            </div>
          ) : (
            <Table
              cols={[
                { label: "Time", align: "left" },
                { label: "Model", align: "left" },
                { label: "In", align: "right" },
                { label: "Out", align: "right" },
                { label: "Cost", align: "right" },
                { label: "Latency", align: "right" },
              ]}
              rows={recent.map((e, i) => ({
                key: `${e.ts}-${i}`,
                cells: [
                  fmtTime(e.ts),
                  shortModel(e.model),
                  e.input_tokens.toLocaleString(),
                  e.output_tokens.toLocaleString(),
                  `$${e.cost_usd.toFixed(4)}`,
                  `${(e.latency_ms / 1000).toFixed(1)}s`,
                ],
              }))}
              monospace
            />
          )}
        </Section>

        <footer
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: "1px solid rgba(148, 163, 184, 0.1)",
            fontSize: 11,
            color: "#475569",
            textAlign: "center",
          }}
        >
          USD → CNY 按 {USD_TO_CNY} 估算 · 数据来自{" "}
          <code>/opt/edu-solver/data/usage.jsonl</code>
        </footer>
      </div>
    </main>
  );
}

// ============================================
// helpers
// ============================================

function sum<T>(arr: T[], get: (x: T) => number): number {
  return arr.reduce((s, x) => s + get(x), 0);
}

function fmtTokens(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  if (isToday) return time;
  const date = `${d.getMonth() + 1}/${d.getDate()}`;
  return `${date} ${time}`;
}

function shortModel(m: string): string {
  return m
    .replace("claude-", "")
    .replace(/-\d{8}$/, "");
}

function groupByDate(entries: UsageEntry[]) {
  const map = new Map<
    string,
    { date: string; calls: number; tokens: number; cost: number }
  >();
  for (const e of entries) {
    const date = e.ts.slice(0, 10);
    const cur = map.get(date) || {
      date,
      calls: 0,
      tokens: 0,
      cost: 0,
    };
    cur.calls += 1;
    cur.tokens += e.input_tokens + e.output_tokens;
    cur.cost += e.cost_usd;
    map.set(date, cur);
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================
// 视觉组件 (内联样式, 不依赖 Tailwind, 也不依赖父页 globals.css)
// ============================================

function Kpi({
  title,
  value,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight
          ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(236,72,153,0.10))"
          : "#0f172a",
        border: highlight
          ? "1px solid rgba(245,158,11,0.4)"
          : "1px solid rgba(148, 163, 184, 0.15)",
        borderRadius: 14,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#94a3b8",
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: highlight ? "#fbbf24" : "#e2e8f0",
          marginTop: 4,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            marginTop: 3,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#06b6d4",
          marginBottom: 10,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

interface TableCol {
  label: string;
  align: "left" | "right";
}

function Table({
  cols,
  rows,
  monospace = false,
}: {
  cols: TableCol[];
  rows: { key: string; cells: (string | number)[] }[];
  monospace?: boolean;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid rgba(148, 163, 184, 0.15)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            fontFamily: monospace
              ? "'JetBrains Mono', monospace"
              : "inherit",
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(148,163,184,0.05)",
                borderBottom: "1px solid rgba(148,163,184,0.15)",
              }}
            >
              {cols.map((c, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: c.align,
                    padding: "10px 14px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    fontSize: 11,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.key}
                style={{
                  borderBottom:
                    "1px solid rgba(148,163,184,0.08)",
                }}
              >
                {r.cells.map((cell, i) => (
                  <td
                    key={i}
                    style={{
                      textAlign: cols[i].align,
                      padding: "9px 14px",
                      color: "#cbd5e1",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
