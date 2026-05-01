import type { MetadataRoute } from "next";

// Next.js App Router 会把这个 manifest 暴露在 /manifest.webmanifest
// 浏览器在加到主屏幕时读它

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Solver",
    short_name: "AI Solver",
    description: "拍一拍, AI 教你做 — 全学科 AI 解题助手",
    start_url: "/",
    display: "standalone", // 关键: 加到主屏后无地址栏全屏
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#f59e0b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["education", "productivity"],
    lang: "zh-CN",
  };
}
