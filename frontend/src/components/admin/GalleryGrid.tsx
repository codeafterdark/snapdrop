import { useState } from "react";
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

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100">
            {isVideo(photo.mime_type) ? (
              <>
                <video
                  src={photo.signed_url}
                  preload="metadata"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(photo)}
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <img
                src={photo.signed_url}
                alt={`Photo by ${photo.attendee_name}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(photo)}
                loading="lazy"
              />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex flex-col justify-end p-2">
              <div className="translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                <p className="text-white text-xs font-medium truncate">{photo.attendee_name}</p>
                <p className="text-white/70 text-xs">{formatDateTime(photo.uploaded_at)}</p>
              </div>
            </div>
            {/* Delete button */}
            <button
              onClick={() => setDeleteTarget(photo)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
              aria-label="Delete photo"
            >
              ✕
            </button>
          </div>
        ))}
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
