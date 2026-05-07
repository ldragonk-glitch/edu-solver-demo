"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  onConfirm: (base64: string, mediaType: string) => void;
  onCancel: () => void;
}

type Box = { x: number; y: number; w: number; h: number };
type ImgRect = { x: number; y: number; w: number; h: number; scale: number };
type Corner = "nw" | "ne" | "sw" | "se";
type Drag =
  | { kind: "move"; startBox: Box; startPointer: { x: number; y: number } }
  | {
      kind: "resize";
      corner: Corner;
      startBox: Box;
      startPointer: { x: number; y: number };
    };

const MIN_BOX = 60;
const HANDLE_HIT = 36; // 触屏命中区
const HANDLE_VISUAL = 22; // L 型角标的边长

export default function CropStep({ src, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [imgRect, setImgRect] = useState<ImgRect | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);

  const recompute = useCallback(() => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img || !img.naturalWidth) return;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scale = Math.min(cw / nw, ch / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const ix = (cw - dw) / 2;
    const iy = (ch - dh) / 2;
    const next: ImgRect = { x: ix, y: iy, w: dw, h: dh, scale };
    setImgRect(next);
    setBox((prev) => {
      if (prev) {
        // clamp existing box into new image rect
        return clampBoxToImg(prev, next);
      }
      return {
        x: ix + dw * 0.1,
        y: iy + dh * 0.32,
        w: dw * 0.8,
        h: dh * 0.36,
      };
    });
  }, []);

  useEffect(() => {
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [recompute]);

  // ---- pointer handling ----
  const onPointerDown = (
    e: React.PointerEvent,
    init: (
      pointer: { x: number; y: number },
      startBox: Box,
    ) => Drag,
  ) => {
    if (!box) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = init({ x: e.clientX, y: e.clientY }, box);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !imgRect) return;
    const dx = e.clientX - d.startPointer.x;
    const dy = e.clientY - d.startPointer.y;

    if (d.kind === "move") {
      const next = clampBoxToImg(
        { ...d.startBox, x: d.startBox.x + dx, y: d.startBox.y + dy },
        imgRect,
      );
      setBox(next);
      return;
    }

    // resize
    let { x, y, w, h } = d.startBox;
    const right = x + w;
    const bottom = y + h;
    if (d.corner === "nw") {
      x = Math.min(d.startBox.x + dx, right - MIN_BOX);
      y = Math.min(d.startBox.y + dy, bottom - MIN_BOX);
      w = right - x;
      h = bottom - y;
    } else if (d.corner === "ne") {
      y = Math.min(d.startBox.y + dy, bottom - MIN_BOX);
      w = Math.max(d.startBox.w + dx, MIN_BOX);
      h = bottom - y;
    } else if (d.corner === "sw") {
      x = Math.min(d.startBox.x + dx, right - MIN_BOX);
      w = right - x;
      h = Math.max(d.startBox.h + dy, MIN_BOX);
    } else {
      // se
      w = Math.max(d.startBox.w + dx, MIN_BOX);
      h = Math.max(d.startBox.h + dy, MIN_BOX);
    }
    setBox(clampBoxToImg({ x, y, w, h }, imgRect));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // ---- confirm ----
  const handleConfirm = async () => {
    if (!box || !imgRect || !imgRef.current || busy) return;
    setBusy(true);
    try {
      const img = imgRef.current;
      const sx = Math.max(0, (box.x - imgRect.x) / imgRect.scale);
      const sy = Math.max(0, (box.y - imgRect.y) / imgRect.scale);
      const sw = Math.min(img.naturalWidth - sx, box.w / imgRect.scale);
      const sh = Math.min(img.naturalHeight - sy, box.h / imgRect.scale);
      if (sw < 1 || sh < 1) throw new Error("选区太小");

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas 不可用");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onConfirm(dataUrl.split(",")[1], "image/jpeg");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`裁剪失败: ${msg}`);
      setBusy(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black select-none"
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* 顶部提示 — 半透明胶囊 */}
      <div
        className="absolute left-1/2 z-30"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 14px)",
          transform: "translateX(-50%)",
          padding: "7px 14px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "rgba(255,255,255,0.95)",
          fontSize: 12.5,
          fontWeight: 500,
          letterSpacing: 0.2,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        拖动方框 / 拉角调整, 框住一道题
      </div>

      {/* 图片 */}
      <img
        ref={imgRef}
        src={src}
        alt="待裁剪"
        onLoad={recompute}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: "contain" }}
        draggable={false}
      />

      {/* 暗色遮罩 + box 边框 (圆角, 跟随 border-radius 抠出选区) */}
      {box && imgRect && (
        <>
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              borderRadius: 14,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            }}
          />

          {/* box 边框 + 拖动捕捉区 */}
          <div
            className="absolute z-20"
            style={{
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              border: "1.5px solid rgba(255,255,255,0.95)",
              borderRadius: 14,
              boxSizing: "border-box",
              cursor: "move",
              touchAction: "none",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.25) inset",
            }}
            onPointerDown={(e) =>
              onPointerDown(e, (pointer, startBox) => ({
                kind: "move",
                startBox,
                startPointer: pointer,
              }))
            }
          />

          {/* 4 个角的 handle (L 型角标, 白色, 类似相机对焦框) */}
          {(["nw", "ne", "sw", "se"] as Corner[]).map((corner) => {
            const isLeft = corner === "nw" || corner === "sw";
            const isTop = corner === "nw" || corner === "ne";
            const cx = isLeft ? box.x : box.x + box.w;
            const cy = isTop ? box.y : box.y + box.h;
            return (
              <div
                key={corner}
                className="absolute z-30"
                style={{
                  left: cx - HANDLE_HIT / 2,
                  top: cy - HANDLE_HIT / 2,
                  width: HANDLE_HIT,
                  height: HANDLE_HIT,
                  cursor:
                    corner === "nw" || corner === "se"
                      ? "nwse-resize"
                      : "nesw-resize",
                  touchAction: "none",
                }}
                onPointerDown={(e) =>
                  onPointerDown(e, (pointer, startBox) => ({
                    kind: "resize",
                    corner,
                    startBox,
                    startPointer: pointer,
                  }))
                }
              >
                {/* L 型: 两条 3px 白色短边在该角对齐, 长度 HANDLE_VISUAL, 离实际角点 4px */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    [isLeft ? "left" : "right"]: HANDLE_HIT / 2 - 1,
                    [isTop ? "top" : "bottom"]: HANDLE_HIT / 2 - 1,
                    width: HANDLE_VISUAL,
                    height: 3,
                    background: "white",
                    borderRadius: 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
                  }}
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    [isLeft ? "left" : "right"]: HANDLE_HIT / 2 - 1,
                    [isTop ? "top" : "bottom"]: HANDLE_HIT / 2 - 1,
                    width: 3,
                    height: HANDLE_VISUAL,
                    background: "white",
                    borderRadius: 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
                  }}
                />
              </div>
            );
          })}
        </>
      )}

      {/* 底部操作栏 */}
      <div
        className="absolute left-0 right-0 z-40 flex gap-3"
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
          disabled={!box || busy}
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

// ---- helpers ----
function clampBoxToImg(b: Box, r: ImgRect): Box {
  let { x, y, w, h } = b;
  // 尺寸不能超过图片
  w = Math.min(w, r.w);
  h = Math.min(h, r.h);
  // 位置夹到图片范围内
  x = Math.max(r.x, Math.min(x, r.x + r.w - w));
  y = Math.max(r.y, Math.min(y, r.y + r.h - h));
  return { x, y, w, h };
}
