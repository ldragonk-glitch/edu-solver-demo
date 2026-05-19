"use client";

import { useEffect, useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";
import SolutionFrame from "@/components/SolutionFrame";

type ApiResponse =
  | {
      html: string;
      summary?: string;
      usage?: unknown;
      provider?: ModelProvider;
      model?: string;
    }
  | { error: string };

type ModelProvider = "claude" | "glm" | "kimi";

const MODEL_OPTIONS: { value: ModelProvider; label: string; hint: string }[] = [
  { value: "claude", label: "Claude", hint: "Sonnet 4.6" },
  { value: "glm", label: "GLM", hint: "5V Turbo" },
  { value: "kimi", label: "Kimi", hint: "K2.6" },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<ModelProvider>("claude");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [returnedProvider, setReturnedProvider] =
    useState<ModelProvider | null>(null);
  const [returnedModel, setReturnedModel] = useState<string | null>(null);

  useEffect(() => {
    setShowModelPicker(
      new URLSearchParams(window.location.search).get("models") === "1",
    );
  }, []);

  const handleCapture = async (base64: string, mediaType: string) => {
    setLoading(true);
    setError(null);
    setHtml(null);
    setSummary(null);
    setLatencyMs(null);
    setReturnedProvider(null);
    setReturnedModel(null);
    const t0 = performance.now();

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mediaType,
          provider: showModelPicker ? selectedProvider : undefined,
        }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : `HTTP ${res.status}`);
      }
      setHtml(data.html);
      setSummary(data.summary || null);
      setReturnedProvider(data.provider || null);
      setReturnedModel(data.model || null);
      setLatencyMs(Math.round(performance.now() - t0));
    } catch (err) {
      const message =
        err instanceof Error
            ? err.message
            : "未知错误";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setHtml(null);
    setSummary(null);
    setError(null);
    setLatencyMs(null);
    setReturnedProvider(null);
    setReturnedModel(null);
  };

  // ============= 解题页面 (iframe 占满) =============
  if (html) {
    return (
      <main
        style={{
          minHeight: "100vh",
          height: "100vh",
          background: "#020617",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 顶部工具栏 — paddingTop 给 iOS 刘海/状态栏留 safe area */}
        <div
          style={{
            flexShrink: 0,
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            paddingBottom: 10,
            paddingLeft: "calc(env(safe-area-inset-left, 0px) + 14px)",
            paddingRight: "calc(env(safe-area-inset-right, 0px) + 14px)",
            background: "rgba(2, 6, 23, 0.92)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={reset}
            style={{
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#fbbf24",
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ← 新题
          </button>
          {summary && (
            <div
              style={{
                flex: 1,
                fontSize: 12,
                color: "#94a3b8",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {summary}
            </div>
          )}
          {latencyMs != null && (
            <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>
              {(latencyMs / 1000).toFixed(1)}s
            </span>
          )}
          {showModelPicker && (returnedProvider || returnedModel) && (
            <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>
              {formatProvider(returnedProvider)}
              {returnedModel ? ` · ${returnedModel}` : ""}
            </span>
          )}
        </div>

        {/* iframe 占满剩余空间 */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <SolutionFrame html={html} />
        </div>
      </main>
    );
  }

  // ============= 主页 (拍照 / 上传) =============
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, rgba(168, 85, 247, 0.18), transparent 50%), radial-gradient(ellipse at bottom right, rgba(245, 158, 11, 0.15), transparent 50%), #020617",
        display: "flex",
        flexDirection: "column",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 32px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)",
        paddingLeft: "calc(env(safe-area-inset-left, 0px) + 20px)",
        paddingRight: "calc(env(safe-area-inset-right, 0px) + 20px)",
      }}
    >
      {/* Hero 区 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#f59e0b",
              letterSpacing: 3,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            AI Solver
          </div>
          <h1
            className="gradient-text"
            style={{
              fontSize: 42,
              fontWeight: 800,
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: -1,
            }}
          >
            拍一拍
            <br />
            AI 教你做
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#94a3b8",
              marginTop: 16,
              lineHeight: 1.6,
            }}
          >
            数学 · 物理 · 化学 · 生物 · 任何科目
            <br />
            把题目拍下来, AI 一步步讲给你听
          </p>
        </div>

        {/* 拍照 / 上传 */}
        {!loading && !error && (
          <>
            {showModelPicker && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {MODEL_OPTIONS.map((option) => {
                  const active = selectedProvider === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedProvider(option.value)}
                      aria-pressed={active}
                      style={{
                        minHeight: 58,
                        borderRadius: 12,
                        border: active
                          ? "1px solid rgba(251, 191, 36, 0.75)"
                          : "1px solid rgba(148, 163, 184, 0.22)",
                        background: active
                          ? "rgba(245, 158, 11, 0.16)"
                          : "rgba(15, 23, 42, 0.72)",
                        color: active ? "#fbbf24" : "#cbd5e1",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ display: "block", fontSize: 13 }}>
                        {option.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          fontSize: 10,
                          color: active ? "#fcd34d" : "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <PhotoCapture onCapture={handleCapture} disabled={loading} />
          </>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div className="spinner" />
            <p
              style={{
                fontSize: 14,
                color: "#e2e8f0",
                marginTop: 18,
                fontWeight: 600,
              }}
            >
              AI 正在解题...
            </p>
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
              通常 15–60 秒, 复杂题可能更久
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 16,
              padding: 18,
              marginTop: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fca5a5",
                marginBottom: 8,
              }}
            >
              出错了
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                lineHeight: 1.5,
                wordBreak: "break-all",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {error}
            </div>
            <button
              onClick={reset}
              style={{
                marginTop: 12,
                padding: "8px 16px",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#fca5a5",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              重试
            </button>
          </div>
        )}
      </div>

      {/* 底部品牌 */}
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "#64748b",
          marginTop: 32,
          letterSpacing: 0.5,
          fontWeight: 600,
        }}
      >
        <span className="gradient-text" style={{ fontWeight: 700 }}>
          RiverStone
        </span>
        <span style={{ color: "#475569" }}> Singapore 出品</span>
      </div>
    </main>
  );
}

function formatProvider(provider: ModelProvider | null): string {
  if (provider === "glm") return "GLM";
  if (provider === "kimi") return "Kimi";
  return "Claude";
}
