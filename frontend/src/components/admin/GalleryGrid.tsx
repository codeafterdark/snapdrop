import { useState, useRef } from "react";
import { PhotoPublic, photosApi } from "@/api/photos";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

interface GalleryGridProps {
  photos: PhotoPublic[];
  eventId: string;
}

const isVideo = (mime: string) => mime?.startsWith("video/");

export function GalleryGrid({ photos, eventId }: GalleryGridProps) {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<PhotoPublic | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<PhotoPublic | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Pre-fetched image blobs keyed by photo id — populated on selection so they're
  // ready instantly when the user taps Share (navigator.share must be called
  // synchronously with the tap gesture; any await before it kills iOS sharing)
  const blobCache = useRef<Map<string, File>>(new Map());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Kick off a background fetch so the file is ready when Share is tapped
        const photo = photos.find((p) => p.id === id);
        if (photo && !isVideo(photo.mime_type) && !blobCache.current.has(id)) {
          fetch(photo.signed_url)
            .then((res) => res.blob())
            .then((blob) => {
              blobCache.current.set(id, new File([blob], photo.file_name || "photo.jpg", { type: blob.type }));
            })
            .catch(() => { /* CORS not configured for GET — will fall back to URL share */ });
        }
      }
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
    blobCache.current.clear();
  };

  const sharePhotos = async () => {
    const selectedPhotos = photos.filter((p) => selected.has(p.id) && !isVideo(p.mime_type));
    if (!selectedPhotos.length) {
      toast.error("No photos selected (videos cannot be shared)");
      return;
    }

    // Mobile / iOS: use native share sheet
    // IMPORTANT: navigator.share must be called synchronously with the tap gesture.
    // Pre-fetched blobs (from toggleSelect) are used so no awaiting is needed here.
    if (typeof navigator.share === "function") {
      const files = selectedPhotos
        .slice(0, 5)
        .map((p) => blobCache.current.get(p.id))
        .filter((f): f is File => !!f);

      try {
        if (files.length > 0 && navigator.canShare?.({ files })) {
          // Share actual image files → appears as a photo in Facebook/Messages/etc.
          await navigator.share({ files, title: "Event Photos" });
        } else {
          // Blobs not ready yet (selected < 1s ago) or CORS blocked — fall back to URL
          await navigator.share({ url: selectedPhotos[0].signed_url, title: "Event Photos" });
          if (files.length === 0) {
            toast("Tip: wait a moment after selecting before tapping Share for best results", { duration: 5000 });
          }
        }
        if (selectedPhotos.length > 1 && files.length <= 1) {
          toast("Share remaining photos one at a time", { duration: 4000 });
        }
      } catch (err: any) {
        if (err.name !== "AbortError") toast.error("Could not open share sheet");
      }
      exitSelectMode();
      return;
    }

    // Desktop: open Facebook share dialog for each selected photo
    if (selectedPhotos.length > 5) {
      toast.error("Select up to 5 photos to share");
      return;
    }
    selectedPhotos.forEach((photo) => {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photo.signed_url)}`,
        "_blank",
        "noopener,noreferrer"
      );
    });
    exitSelectMode();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await photosApi.delete(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ["photos", eventId] });
      toast.success("Photo deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete photo");
    } finally {
      setDeleting(false);
    }
  };

  if (!photos.length) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500">No photos or videos submitted yet</p>
      </div>
    );
  }

  const selectedImages = photos.filter((p) => selected.has(p.id) && !isVideo(p.mime_type));

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        {selectMode ? (
          <>
            <span className="text-sm text-gray-600">
              {selected.size === 0 ? "Tap photos to select" : `${selected.size} selected`}
            </span>
            <div className="flex items-center gap-2">
              {selectedImages.length > 0 && (
                <button
                  onClick={sharePhotos}
                  className="flex items-center gap-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Share
                </button>
              )}
              <button
                onClick={exitSelectMode}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            className="ml-auto text-sm text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 rounded-lg border border-brand-200 hover:border-brand-300 transition-colors"
          >
            Select
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo) => {
          const isSelected = selected.has(photo.id);
          return (
            <div
              key={photo.id}
              className={`group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(photo.id);
                } else {
                  setLightbox(photo);
                }
              }}
            >
              {isVideo(photo.mime_type) ? (
                <>
                  <video
                    src={photo.signed_url}
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                  {/* Play button overlay */}
                  {!selectMode && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={photo.signed_url}
                  alt={`Photo by ${photo.attendee_name}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Selection checkbox */}
              {selectMode && (
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-blue-500 border-blue-500" : "bg-black/30 border-white"}`}>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}

              {/* Hover overlay (only when not in select mode) */}
              {!selectMode && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex flex-col justify-end p-2">
                  <div className="translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                    <p className="text-white text-xs font-medium truncate">{photo.attendee_name}</p>
                    <p className="text-white/70 text-xs">{formatDateTime(photo.uploaded_at)}</p>
                  </div>
                </div>
              )}

              {/* Delete button (only when not in select mode) */}
              {!selectMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(photo); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
                  aria-label="Delete photo"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete photo?">
        <p className="text-sm text-gray-600 mb-6">
          This will permanently remove the item uploaded by <strong>{deleteTarget?.attendee_name}</strong>. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {isVideo(lightbox.mime_type) ? (
              <video
                controls
                autoPlay
                className="w-full rounded-xl max-h-[85vh]"
                src={lightbox.signed_url}
              />
            ) : (
              <img src={lightbox.signed_url} alt="" className="w-full rounded-xl max-h-[85vh] object-contain" />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-xl">
              <p className="text-white font-medium">{lightbox.attendee_name}</p>
              <p className="text-white/60 text-sm">{formatDateTime(lightbox.uploaded_at)}</p>
            </div>
            <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70">✕</button>
          </div>
        </div>
      )}
    </>
  );
}
