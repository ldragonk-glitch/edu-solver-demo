"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  html: string;
  /** 高度, 默认填满视口减去顶部工具栏 */
  height?: string | number;
}

// 把 Claude 生成的完整 HTML 页面塞进 iframe sandbox 渲染.
// 用 srcdoc 模式: HTML 字符串直接传给 iframe, 不需要后端额外路由.
export default function SolutionFrame({ html, height = "100%" }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [html]);

  return (
    <div className="relative w-full" style={{ height }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-slate-500 text-xs">渲染中...</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        // allow-scripts 让 Babel + React 能跑;
        // 不加 allow-same-origin 隔绝主页面的 storage / cookies (沙箱)
        sandbox="allow-scripts allow-popups"
        onLoad={() => setLoaded(true)}
        title="solution"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "transparent",
        }}
      />
    </div>
  );
}
