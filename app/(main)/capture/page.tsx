"use client";

import { useRef } from "react";
import CameraView from "@/components/capture/CameraView";

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Capture</h1>
      <div className="w-full max-w-sm">
        <CameraView ref={videoRef} />
      </div>
    </div>
  );
}
