"use client";

import { useEffect, useRef, useState } from "react";
import { fitWithinMaxSide, SOLVE_IMAGE_QUALITY } from "@/lib/imageSizing";

interface Props {
  onCapture: (base64: string, mediaType: string) => void;
  onClose: () => void;
}

// 用 getUserMedia 直接调摄像头, 而不是依赖 <input capture>
// (后者在桌面浏览器上会 fallback 到文件选择, 不调摄像头)
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
            facingMode: { ideal: "environment" }, // 手机优先后置
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

    const size = fitWithinMaxSide(video.videoWidth, video.videoHeight);
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, size.width, size.height);

    // 输出 jpeg 比 png 小很多, 并限制尺寸避免视觉模型网关拒绝大请求.
    const dataUrl = canvas.toDataURL("image/jpeg", SOLVE_IMAGE_QUALITY);
    const base64 = dataUrl.split(",")[1];

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onCapture(base64, "image/jpeg");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl">
        <div className="bg-black aspect-[4/3] flex items-center justify-center relative overflow-hidden">
          {error ? (
            <div className="text-white text-center p-6">
              <p className="text-red-300 mb-2 font-medium">😕 {error}</p>
              <p className="text-sm opacity-70 leading-relaxed">
                没事, 关掉这个框, 用 "上传图片" 按钮也能解题.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-contain"
              />
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
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="p-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            className="flex-[2] py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            📸 拍下来
          </button>
        </div>
      </div>
    </div>
  );
}
