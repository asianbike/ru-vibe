"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraView({
  ref,
}: {
  ref: React.RefObject<HTMLVideoElement | null>;
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("");

  // 페이지를 떠날 때 카메라를 확실히 끈다 (안 그러면 카메라가 켜진 채로 남음)
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  // 브라우저가 페이지 로드 직후의 카메라 요청을 막거나 무시하는 경우가 있어 클릭에서 요청한다.
  // 클릭 기반이면 StrictMode의 이중 마운트로 요청이 두 번 겹치는 문제도 함께 사라진다.
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(
        `No camera API. isSecureContext=${window.isSecureContext}, origin=${window.location.origin}`
      );
      return;
    }

    setStatus("Requesting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      const video = ref.current;
      if (!video) {
        setStatus("No <video> element — ref not attached");
        return;
      }
      video.srcObject = stream;
      await video.play();

      setStreaming(true);
      setStatus("");
    } catch (e) {
      // 원인별로 대응이 달라서 에러 이름을 그대로 노출 (NotAllowedError / NotFoundError / NotReadableError …)
      setStatus(`${(e as Error).name} — ${(e as Error).message}`);
    }
  }

  return (
    <>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className="aspect-[3/4] w-full rounded bg-black object-cover"
      />
      {!streaming && (
        <button
          type="button"
          onClick={start}
          className="mt-2 w-full rounded bg-black px-3 py-2 text-white"
        >
          Start camera
        </button>
      )}
      {status && <p className="mt-2 text-sm break-words text-amber-600">{status}</p>}
    </>
  );
}
