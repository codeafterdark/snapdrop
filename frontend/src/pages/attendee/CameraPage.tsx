import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAttendeeStore } from "@/stores/attendeeStore";
import { eventsApi } from "@/api/events";
import { photosApi } from "@/api/photos";
import { Spinner } from "@/components/common/Spinner";
import { ALLOWED_MIME_TYPES, MAX_PHOTO_SIZE_BYTES, MAX_VIDEO_SIZE_BYTES, VIDEO_MIME_TYPES } from "@/lib/constants";

type PhotoStatus = "pending" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: Blob;
  dataUrl: string;
  name: string;
  mimeType: string;
  status: PhotoStatus;
  progress: number;
}

export function CameraPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { deviceToken, displayName, eventSlug, initDeviceToken } = useAttendeeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);

  const token = deviceToken ?? initDeviceToken();
  const uploadedCount = queue.filter((p) => p.status === "done").length;
  const pendingItems = queue.filter((p) => p.status === "pending");
  const failedCount = queue.filter((p) => p.status === "error").length;
  const allDone = queue.length > 0 && pendingItems.length === 0 && !processing;

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newItems: QueueItem[] = [];
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) continue;
      const isVideo = VIDEO_MIME_TYPES.includes(file.type);
      const sizeLimit = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_PHOTO_SIZE_BYTES;
      if (file.size > sizeLimit) continue;
      newItems.push({
        id: crypto.randomUUID(),
        file,
        dataUrl: URL.createObjectURL(file),
        name: file.name,
        mimeType: file.type,
        status: "pending",
        progress: 0,
      });
    }
    setQueue((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const processQueue = async () => {
    if (!event?.id || processing) return;
    setProcessing(true);
    const pending = queue.filter((p) => p.status === "pending");
    for (const item of pending) {
      setQueue((prev) => prev.map((p) => p.id === item.id ? { ...p, status: "uploading", progress: 0 } : p));
      try {
        const { upload_url, r2_key } = await photosApi.requestUploadUrl(event.id, token, {
          name: item.name,
          size: item.file.size,
          type: item.mimeType,
        });
        await photosApi.uploadToR2(upload_url, item.file, item.mimeType, (pct) => {
          setQueue((prev) => prev.map((p) => p.id === item.id ? { ...p, progress: pct } : p));
        });
        await photosApi.confirmUpload(event.id, token, {
          r2_key,
          file_name: item.name,
          file_size_bytes: item.file.size,
          mime_type: item.mimeType,
        });
        setQueue((prev) => prev.map((p) => p.id === item.id ? { ...p, status: "done", progress: 100 } : p));
      } catch (err: any) {
        setQueue((prev) => prev.map((p) => p.id === item.id ? { ...p, status: "error" } : p));
      }
    }
    setProcessing(false);
  };

  const retryFailed = () => {
    setQueue((prev) => prev.map((p) => p.status === "error" ? { ...p, status: "pending", progress: 0 } : p));
  };

  if (!displayName) return null;

  if (event && new Date() > new Date(event.ends_at)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-center">
        <p className="text-white text-lg font-medium">This event has ended</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 shrink-0">
        <div>
          <p className="text-white text-sm font-medium">{displayName}</p>
          <p className="text-white/40 text-xs">{event?.name}</p>
        </div>
        {uploadedCount > 0 && (
          <button
            onClick={() => navigate(`/e/${slug}/done`)}
            className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-full"
          >
            Done · {uploadedCount} ✓
          </button>
        )}
      </div>

      {/* Photo grid / empty state */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-1">Share your photos</p>
              <p className="text-white/40 text-sm">Select one or more photos from your library</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-brand-600 text-white font-semibold px-8 py-3.5 rounded-2xl text-sm active:scale-95 transition-transform"
            >
              Choose Photos
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
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-brand-500 transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
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

      {/* Bottom controls */}
      <div className="shrink-0 px-4 py-4 bg-black/80 space-y-2">
        {failedCount > 0 && (
          <button onClick={retryFailed} className="w-full py-2 text-red-400 text-xs font-medium text-center">
            {failedCount} photo{failedCount !== 1 ? "s" : ""} failed — tap to retry
          </button>
        )}
        <div className="flex gap-3">
          {queue.length > 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 rounded-2xl border border-white/20 text-white text-sm font-medium"
            >
              + Add More
            </button>
          )}
          {pendingItems.length > 0 && (
            <button
              onClick={processQueue}
              disabled={processing}
              className="flex-1 py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {processing
                ? <><Spinner size="sm" /><span>Uploading…</span></>
                : `Upload ${pendingItems.length} photo${pendingItems.length !== 1 ? "s" : ""}`}
            </button>
          )}
          {allDone && failedCount === 0 && (
            <button
              onClick={() => navigate(`/e/${slug}/done`)}
              className="flex-1 py-3 rounded-2xl bg-green-600 text-white text-sm font-semibold"
            >
              All done ✓
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
