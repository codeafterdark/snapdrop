import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCamera } from "@/hooks/useCamera";
import { useAttendeeStore } from "@/stores/attendeeStore";
import { eventsApi } from "@/api/events";
import { photosApi } from "@/api/photos";
import { Spinner } from "@/components/common/Spinner";
import { ALLOWED_MIME_TYPES, MAX_PHOTO_SIZE_BYTES } from "@/lib/constants";

type PhotoStatus = "pending" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: Blob;
  dataUrl: string;
  name: string;
  mimeType: string;
  status: PhotoStatus;
  errorMsg?: string;
}

type Tab = "camera" | "gallery";

export function CameraPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { deviceToken, displayName, eventSlug, initDeviceToken } = useAttendeeStore();
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("camera");
  const [captured, setCaptured] = useState<{ blob: Blob; dataUrl: string; mimeType: string } | null>(null);
  const [cameraUploading, setCameraUploading] = useState(false);
  const [cameraError, setCameraErrorMsg] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processingQueue, setProcessingQueue] = useState(false);

  const token = deviceToken ?? initDeviceToken();
  const uploadedCount = queue.filter((p) => p.status === "done").length;
  const pendingItems = queue.filter((p) => p.status === "pending");

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

  const { videoRef, isActive, error: camHardwareError, startCamera, stopCamera, capture } = useCamera();

  // Start/stop camera based on tab + capture state
  useEffect(() => {
    if (tab === "camera" && !captured) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [tab, captured]);

  // ── Camera tab ─────────────────────────────────────────────────────────────

  const handleCapture = () => {
    const photo = capture();
    if (photo) {
      stopCamera();
      setCaptured(photo);
      setCameraErrorMsg(null);
    }
  };

  const handleRetake = () => {
    setCaptured(null);
    setCameraErrorMsg(null);
    startCamera();
  };

  const handleCameraSubmit = async () => {
    if (!captured || !event?.id) return;
    setCameraUploading(true);
    setCameraErrorMsg(null);
    try {
      const { upload_url, r2_key } = await photosApi.requestUploadUrl(event.id, token, {
        name: `photo_${Date.now()}.jpg`,
        size: captured.blob.size,
        type: captured.mimeType,
      });
      await photosApi.uploadToR2(upload_url, captured.blob, captured.mimeType);
      await photosApi.confirmUpload(event.id, token, {
        r2_key,
        file_name: `photo_${Date.now()}.jpg`,
        file_size_bytes: captured.blob.size,
        mime_type: captured.mimeType,
      });
      // Add to queue as done so the counter updates
      setQueue((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          file: captured.blob,
          dataUrl: captured.dataUrl,
          name: `photo_${Date.now()}.jpg`,
          mimeType: captured.mimeType,
          status: "done",
        },
      ]);
      // Loop back to live viewfinder
      setCaptured(null);
      startCamera();
    } catch (err: any) {
      setCameraErrorMsg(err.response?.data?.detail ?? err.message ?? "Upload failed. Try again.");
    } finally {
      setCameraUploading(false);
    }
  };

  // ── Gallery tab ────────────────────────────────────────────────────────────

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newItems: QueueItem[] = [];
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) continue;
      if (file.size > MAX_PHOTO_SIZE_BYTES) continue;
      newItems.push({
        id: crypto.randomUUID(),
        file,
        dataUrl: URL.createObjectURL(file),
        name: file.name,
        mimeType: file.type,
        status: "pending",
      });
    }
    setQueue((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const processQueue = async () => {
    if (!event?.id || processingQueue) return;
    setProcessingQueue(true);
    const pending = queue.filter((p) => p.status === "pending");
    for (const item of pending) {
      setQueue((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: "uploading" } : p)));
      try {
        const { upload_url, r2_key } = await photosApi.requestUploadUrl(event.id, token, {
          name: item.name,
          size: item.file.size,
          type: item.mimeType,
        });
        await photosApi.uploadToR2(upload_url, item.file, item.mimeType);
        await photosApi.confirmUpload(event.id, token, {
          r2_key,
          file_name: item.name,
          file_size_bytes: item.file.size,
          mime_type: item.mimeType,
        });
        setQueue((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: "done" } : p)));
      } catch (err: any) {
        const msg = err.response?.data?.detail ?? err.message ?? "Upload failed";
        setQueue((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: "error", errorMsg: msg } : p)));
      }
    }
    setProcessingQueue(false);
  };

  const retryFailed = () => {
    setQueue((prev) => prev.map((p) => (p.status === "error" ? { ...p, status: "pending", errorMsg: undefined } : p)));
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!displayName) return null;

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

  const failedCount = queue.filter((p) => p.status === "error").length;

  return (
    <div className="h-[100dvh] bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 z-20 shrink-0">
        <span className="text-white/70 text-xs font-medium truncate max-w-[120px]">{displayName}</span>
        <span className="text-white/40 text-xs truncate max-w-[120px] text-center">{event?.name}</span>
        {uploadedCount > 0 ? (
          <button
            onClick={() => navigate(`/e/${slug}/done`)}
            className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
          >
            Done · {uploadedCount} ✓
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-black/40 border-b border-white/10 shrink-0 z-10">
        {(["camera", "gallery"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? "text-white border-b-2 border-brand-400" : "text-white/40"
            }`}
            onClick={() => {
              if (t === "gallery" && captured) setCaptured(null);
              setTab(t);
            }}
          >
            {t === "gallery" && queue.length > 0 ? `Gallery (${queue.length})` : t === "camera" ? "Camera" : "Gallery"}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        {tab === "camera" ? (
          <>
            {!captured ? (
              <>
                {isActive && (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
                {camHardwareError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-4">
                    <p className="text-white/80 text-sm">{camHardwareError}</p>
                    <button
                      onClick={() => { setTab("gallery"); galleryInputRef.current?.click(); }}
                      className="text-brand-400 text-sm font-medium underline"
                    >
                      Upload from gallery instead
                    </button>
                  </div>
                )}
                {!isActive && !camHardwareError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner size="lg" />
                  </div>
                )}
              </>
            ) : (
              <img src={captured.dataUrl} alt="Preview" className="w-full h-full object-contain bg-black" />
            )}
          </>
        ) : (
          // Gallery tab
          <div className="h-full overflow-y-auto">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center">
                <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Upload from your library</p>
                  <p className="text-white/40 text-sm">Select multiple photos at once</p>
                </div>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="bg-brand-600 text-white font-semibold px-8 py-3.5 rounded-2xl text-sm"
                >
                  Browse Photos
                </button>
              </div>
            ) : (
              <div className="p-3 grid grid-cols-3 gap-2">
                {queue.map((item) => (
                  <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                    <img src={item.dataUrl} alt="" className="w-full h-full object-cover" />
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Spinner size="sm" />
                      </div>
                    )}
                    {item.status === "done" && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-end justify-end p-1.5">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {item.status === "error" && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-end justify-end p-1.5">
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {item.status === "pending" && (
                      <button
                        onClick={() => setQueue((prev) => prev.filter((p) => p.id !== item.id))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 px-4 py-4 bg-black/80 space-y-2.5">
        {tab === "camera" ? (
          !captured ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setTab("gallery"); }}
                className="w-14 text-white/50 hover:text-white text-xs text-center transition-colors"
              >
                Gallery
              </button>
              <button
                onClick={handleCapture}
                disabled={!isActive}
                className="w-16 h-16 bg-white rounded-full border-4 border-gray-400 disabled:opacity-30 active:scale-95 transition-transform"
                aria-label="Take photo"
              />
              <div className="w-14" />
            </div>
          ) : (
            <>
              {cameraError && (
                <p className="text-red-400 text-xs text-center">{cameraError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  disabled={cameraUploading}
                  className="flex-1 py-3 rounded-2xl border border-white/20 text-white text-sm font-medium disabled:opacity-40"
                >
                  Retake
                </button>
                <button
                  onClick={handleCameraSubmit}
                  disabled={cameraUploading}
                  className="flex-1 py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {cameraUploading ? <><Spinner size="sm" /><span>Uploading…</span></> : "Submit"}
                </button>
              </div>
            </>
          )
        ) : (
          // Gallery controls
          <div className="space-y-2">
            {failedCount > 0 && (
              <button onClick={retryFailed} className="w-full py-2 text-red-400 text-xs font-medium">
                {failedCount} photo{failedCount !== 1 ? "s" : ""} failed — tap to retry
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 py-3 rounded-2xl border border-white/20 text-white text-sm font-medium"
              >
                {queue.length === 0 ? "Select Photos" : "+ Add More"}
              </button>
              {pendingItems.length > 0 && (
                <button
                  onClick={processQueue}
                  disabled={processingQueue}
                  className="flex-1 py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {processingQueue
                    ? <><Spinner size="sm" /><span>Uploading…</span></>
                    : `Upload ${pendingItems.length} photo${pendingItems.length !== 1 ? "s" : ""}`}
                </button>
              )}
              {pendingItems.length === 0 && uploadedCount > 0 && !processingQueue && (
                <button
                  onClick={() => navigate(`/e/${slug}/done`)}
                  className="flex-1 py-3 rounded-2xl bg-green-600 text-white text-sm font-semibold"
                >
                  All done ✓
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden multi-file input — no capture attr so it opens the photo library */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleGallerySelect}
      />
    </div>
  );
}
