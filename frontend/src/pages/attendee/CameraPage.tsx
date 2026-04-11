import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCamera, CapturedPhoto } from "@/hooks/useCamera";
import { useUpload } from "@/hooks/useUpload";
import { useAttendeeStore } from "@/stores/attendeeStore";
import { eventsApi } from "@/api/events";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";

export function CameraPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { deviceToken, displayName, attendeeId, eventSlug, initDeviceToken } = useAttendeeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if no attendee info
  useEffect(() => {
    if (!displayName || eventSlug !== slug) {
      navigate(`/e/${slug}`, { replace: true });
    }
  }, [displayName, eventSlug, slug, navigate]);

  const { data: event } = useQuery({
    queryKey: ["event-public", slug],
    queryFn: () => eventsApi.getPublicBySlug(slug!),
    enabled: !!slug,
  });

  const { videoRef, isActive, error: cameraError, startCamera, stopCamera, capture } = useCamera();
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [useFilePicker, setUseFilePicker] = useState(false);

  const token = deviceToken ?? initDeviceToken();
  const { upload, status: uploadStatus, error: uploadError, reset: resetUpload } = useUpload(
    event?.id ?? "",
    token
  );

  useEffect(() => {
    if (!useFilePicker) startCamera();
    return () => stopCamera();
  }, [useFilePicker]);

  const handleCapture = () => {
    const photo = capture();
    if (photo) { stopCamera(); setCaptured(photo); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCaptured({ blob: file, dataUrl: url, mimeType: file.type });
  };

  const handleRetake = () => {
    setCaptured(null);
    resetUpload();
    if (!useFilePicker) startCamera();
  };

  const handleSubmit = async () => {
    if (!captured || !event?.id) return;
    const photo = await upload(captured.blob, `photo_${Date.now()}.jpg`);
    if (photo) {
      navigate(`/e/${slug}/done`);
    }
  };

  if (!displayName) return null;

  // Closed event
  if (event && new Date() > new Date(event.ends_at)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-white text-lg font-medium mb-2">This event has ended</p>
          <p className="text-gray-400 text-sm">Photo submissions are closed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-900 flex flex-col">
      {/* Name badge */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 absolute top-0 left-0 right-0 z-10">
        <span className="text-white text-sm font-medium">{displayName}</span>
        <span className="text-white/60 text-xs">{event?.name}</span>
      </div>

      {/* Camera / Preview area */}
      <div className="flex-1 relative overflow-hidden">
        {!captured ? (
          <>
            {isActive && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-white mb-4">{cameraError}</p>
                <Button onClick={() => { setUseFilePicker(true); fileInputRef.current?.click(); }} variant="secondary">
                  Choose from Gallery
                </Button>
              </div>
            )}
            {!isActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            )}
          </>
        ) : (
          <img src={captured.dataUrl} alt="Captured" className="w-full h-full object-contain" />
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-6 bg-black/80 flex flex-col gap-4">
        {uploadError && (
          <p className="text-red-400 text-sm text-center bg-red-900/30 rounded-xl px-4 py-3" role="alert">
            {uploadError}
          </p>
        )}

        {!captured ? (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => { setUseFilePicker(true); fileInputRef.current?.click(); }}
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              Gallery
            </button>
            <button
              onClick={handleCapture}
              disabled={!isActive}
              className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 disabled:opacity-40 active:scale-95 transition-transform"
              aria-label="Take photo"
            />
            <div className="w-12" />
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={handleRetake}>
              Retake
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              loading={uploadStatus === "requesting_url" || uploadStatus === "uploading" || uploadStatus === "confirming"}
            >
              Submit
            </Button>
          </div>
        )}
      </div>

      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
