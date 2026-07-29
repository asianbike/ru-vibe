import PolaroidCanvas from "@/components/capture/PolaroidCanvas";

export default function CapturePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Capture</h1>
      <div className="w-full max-w-sm">
        <PolaroidCanvas />
      </div>
    </div>
  );
}
