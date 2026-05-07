"use client";

import { useRef, useState } from "react";
import CameraCapture from "./CameraCapture";
import CropStep from "./CropStep";

interface Props {
  onCapture: (base64: string, mediaType: string) => void;
  disabled?: boolean;
}

function isCoarsePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

export default function PhotoCapture({ onCapture, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件 (JPG / PNG / WEBP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPendingSrc(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleTakePhoto = () => {
    // 手机: 触发原生相机 (input capture). 桌面: 全屏 getUserMedia 取景
    if (isCoarsePointer()) {
      cameraInputRef.current?.click();
    } else {
      setShowCamera(true);
    }
  };

  const handleCropConfirm = (base64: string, mediaType: string) => {
    setPreview(`data:${mediaType};base64,${base64}`);
    setPendingSrc(null);
    onCapture(base64, mediaType);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* 隐藏: 相册上传 */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFileAsDataUrl(f);
            e.target.value = "";
          }}
        />

        {/* 隐藏: 原生相机 (手机) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFileAsDataUrl(f);
            e.target.value = "";
          }}
        />

        {/* 主拍照按钮 */}
        <button
          type="button"
          onClick={handleTakePhoto}
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
          onCapture={(dataUrl) => {
            setShowCamera(false);
            setPendingSrc(dataUrl);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {pendingSrc && (
        <CropStep
          src={pendingSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingSrc(null)}
        />
      )}
    </>
  );
}
