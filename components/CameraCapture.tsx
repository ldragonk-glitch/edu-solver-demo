"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

// 桌面浏览器用 getUserMedia 全屏取景, 手机走原生相机 (在 PhotoCapture 里直接用 input capture)
export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("当前浏览器不支持摄像头 API, 请用 Chrome / Edge / Safari");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Permission") || msg.includes("denied")) {
          setError("浏览器没有给摄像头权限, 请到地址栏左边的图标里允许");
        } else if (msg.includes("NotFound") || msg.includes("device")) {
          setError("没找到摄像头设备");
        } else {
          setError(`摄像头打开失败: ${msg}`);
        }
      }
    })();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onCapture(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-white text-center max-w-sm">
            <p className="text-red-300 mb-2 font-medium">😕 {error}</p>
            <p className="text-sm opacity-70 leading-relaxed mb-6">
              没事, 关掉这个框, 用 "从相册上传" 按钮也能解题.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white font-medium"
            >
              关闭
            </button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* 取景框提示 */}
          {ready && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: "7.5%",
                right: "7.5%",
                top: "20%",
                bottom: "30%",
                border: "1.5px dashed rgba(255,255,255,0.55)",
                borderRadius: 14,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
              }}
            />
          )}

          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-3" />
                <p className="text-sm">正在打开摄像头...</p>
                <p className="text-xs opacity-60 mt-1">
                  浏览器会问你要权限, 点允许
                </p>
              </div>
            </div>
          )}

          {/* 顶部: 取消 */}
          <div
            className="absolute left-0 right-0 flex items-center"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 12px)",
              paddingLeft: "calc(env(safe-area-inset-left, 0px) + 14px)",
              paddingRight: "calc(env(safe-area-inset-right, 0px) + 14px)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-black/55 text-white text-sm font-medium backdrop-blur-sm"
              style={{ padding: "8px 14px", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              ✕ 取消
            </button>
            <div className="flex-1 text-center text-white text-xs opacity-70" style={{ pointerEvents: "none" }}>
              把题目放进虚线框里
            </div>
            <div style={{ width: 70 }} />
          </div>

          {/* 底部: 快门 */}
          <div
            className="absolute left-0 right-0 flex items-center justify-center"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)",
            }}
          >
            <button
              type="button"
              onClick={capture}
              disabled={!ready}
              aria-label="拍照"
              className="rounded-full disabled:opacity-40 transition active:scale-95"
              style={{
                width: 76,
                height: 76,
                background: "white",
                border: "5px solid rgba(255,255,255,0.4)",
                boxShadow: "0 0 0 3px rgba(0,0,0,0.4)",
              }}
            />
          </div>
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
