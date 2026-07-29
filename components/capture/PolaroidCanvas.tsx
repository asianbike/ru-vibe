"use client";

import { useRef, useState } from "react";

// iOS Safari는 캔버스 픽셀 수가 너무 크면 에러 없이 빈 이미지를 내놓는다.
// 48MP 아이폰 사진(8064×6048)이 여기 걸리므로 긴 변을 제한한다.
const MAX_EDGE = 2048;

// 기기 로케일에 따라 형식이 달라지지 않도록 직접 조립한다 (toLocaleString은 폰마다 결과가 다름)
function timestamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function PolaroidCanvas({
  onCapture,
}: {
  onCapture?: (canvas: HTMLCanvasElement) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState(false);
  const [status, setStatus] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 사진을 다시 골라도 onChange가 뜨도록 초기화
    e.target.value = "";
    if (!file) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // 파일을 캔버스에 그릴 수 있는 형태로 디코딩.
      // imageOrientation으로 EXIF 회전을 반영하지 않으면 세로 사진이 눕는다.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      const text = timestamp(new Date());
      const size = Math.round(canvas.width * 0.045); // 해상도가 달라도 같은 비율로 보이게
      const margin = size;

      ctx.font = `${size}px ui-monospace, monospace`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      // 밝은 배경에서도 읽히도록 어두운 테두리를 깔고 그 위에 밝은 글자를 채운다
      ctx.lineWidth = Math.max(2, size * 0.12);
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.strokeText(text, canvas.width - margin, canvas.height - margin);
      ctx.fillStyle = "#ffb300";
      ctx.fillText(text, canvas.width - margin, canvas.height - margin);

      setCaptured(true);
      setStatus("");
      onCapture?.(canvas);
    } catch (err) {
      setStatus(`${(err as Error).name} — ${(err as Error).message}`);
    }
  }

  return (
    <>
      {/* capture="environment" — 탭하면 앨범이 아니라 후면 카메라가 바로 열린다 */}
      <label className="block cursor-pointer rounded bg-red-700 px-3 py-2 text-center text-white">
        {captured ? "Retake" : "Take photo"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
      </label>
      <canvas ref={canvasRef} className={`mt-2 w-full rounded ${captured ? "" : "hidden"}`} />
      {status && <p className="mt-2 text-sm break-words text-amber-600">{status}</p>}
    </>
  );
}
