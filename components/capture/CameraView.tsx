"use client";

import { useEffect, useState } from "react";

export default function CameraView({
  ref,
}: {
  ref: React.RefObject<HTMLVideoElement | null>;
}) {
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        // 스트림이 도착하기 전에 컴포넌트가 사라졌으면 바로 끈다 (카메라 켜진 채 방치 방지)
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (ref.current) ref.current.srcObject = s;
      })
      .catch(() => {
        if (!cancelled) setError("Camera access denied. Enable it in your browser settings.");
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [ref]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="w-full rounded bg-black object-cover"
    />
  );
}
