"use client";

import { useRef, useState } from "react";
import CameraCapture from "./CameraCapture";

interface Props {
  onCapture: (base64: string, mediaType: string) => void;
  disabled?: boolean;
}

export default function PhotoCapture({ onCapture, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件 (JPG / PNG / WEBP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      onCapture(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (base64: string, mediaType: string) => {
    setPreview(`data:${mediaType};base64,${base64}`);
    setShowCamera(false);
    onCapture(base64, mediaType);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {/* 主拍照按钮 — 大号脉动 */}
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={disabled}
          className="glow-pulse"
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)",
            color: "#020617",
            fontWeight: 800,
            fontSize: 17,
            padding: "20px 28px",
            border: "none",
            borderRadius: 18,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "transform 0.15s",
            letterSpacing: 0.3,
          }}
          onMouseDown={(e) =>
            !disabled && (e.currentTarget.style.transform = "scale(0.98)")
          }
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span style={{ fontSize: 22 }}>📷</span>
          <span>拍照解题</span>
        </button>

        {/* 上传按钮 — 次要 */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(8px)",
            color: "#cbd5e1",
            fontWeight: 600,
            fontSize: 14,
            padding: "14px 20px",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            borderRadius: 14,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) =>
            !disabled &&
            (e.currentTarget.style.background = "rgba(30, 41, 59, 0.8)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(15, 23, 42, 0.6)")
          }
        >
          <span>📎</span>
          <span>从相册上传</span>
        </button>

        {preview && (
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "rgba(15, 23, 42, 0.6)",
              marginTop: 4,
            }}
          >
            <img
              src={preview}
              alt="题目预览"
              style={{ width: "100%", display: "block" }}
            />
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
}
