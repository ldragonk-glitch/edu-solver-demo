"use client";

import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

interface Props {
  src: string;
  onConfirm: (base64: string, mediaType: string) => void;
  onCancel: () => void;
}

async function cropToJpegBase64(src: string, area: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("图片加载失败"));
    el.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 不可用");
  ctx.drawImage(
    img,
    Math.round(area.x),
    Math.round(area.y),
    Math.round(area.width),
    Math.round(area.height),
    0,
    0,
    Math.round(area.width),
    Math.round(area.height),
  );
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return dataUrl.split(",")[1];
}

export default function CropStep({ src, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPx(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!areaPx || busy) return;
    setBusy(true);
    try {
      const base64 = await cropToJpegBase64(src, areaPx);
      onConfirm(base64, "image/jpeg");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`裁剪失败: ${msg}`);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      style={{ touchAction: "none" }}
    >
      {/* 顶部提示 */}
      <div
        className="absolute left-0 right-0 z-10 text-center text-white"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
          fontSize: 13,
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          pointerEvents: "none",
        }}
      >
        拖动 / 缩放, 框住要解的那道题
      </div>

      {/* Cropper 占满 */}
      <div className="absolute inset-0">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          minZoom={0.5}
          maxZoom={4}
          aspect={undefined}
          restrictPosition={false}
          objectFit="contain"
          showGrid
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* 底部操作栏 */}
      <div
        className="absolute left-0 right-0 z-10 flex gap-3"
        style={{
          bottom: 0,
          paddingTop: 14,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
          paddingLeft: "calc(env(safe-area-inset-left, 0px) + 18px)",
          paddingRight: "calc(env(safe-area-inset-right, 0px) + 18px)",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 py-3 rounded-xl font-semibold transition"
          style={{
            background: "rgba(255,255,255,0.12)",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.2)",
            fontSize: 15,
          }}
        >
          ← 重拍
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!areaPx || busy}
          className="flex-[2] py-3 rounded-xl font-bold transition disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)",
            color: "#020617",
            fontSize: 16,
            letterSpacing: 0.3,
          }}
        >
          {busy ? "处理中..." : "✓ 解这道"}
        </button>
      </div>
    </div>
  );
}
