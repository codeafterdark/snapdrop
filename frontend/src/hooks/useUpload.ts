import { useState } from "react";
import { photosApi } from "@/api/photos";
import { MAX_PHOTO_SIZE_BYTES, ALLOWED_MIME_TYPES } from "@/lib/constants";

type UploadStatus = "idle" | "requesting_url" | "uploading" | "confirming" | "success" | "error";

export function useUpload(eventId: string, deviceToken: string) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (blob: Blob, fileName: string = "photo.jpg") => {
    setStatus("idle");
    setError(null);
    setProgress(0);

    if (!ALLOWED_MIME_TYPES.includes(blob.type)) {
      setError("File type not allowed. Please use JPEG, PNG, or WebP.");
      setStatus("error");
      return null;
    }
    if (blob.size > MAX_PHOTO_SIZE_BYTES) {
      setError("Photo exceeds the 10MB limit. Please try a smaller image.");
      setStatus("error");
      return null;
    }

    try {
      // Step 1: Get presigned PUT URL from backend
      setStatus("requesting_url");
      const { upload_url, r2_key } = await photosApi.requestUploadUrl(eventId, deviceToken, {
        name: fileName,
        size: blob.size,
        type: blob.type,
      });

      // Step 2: PUT the blob directly to R2
      setStatus("uploading");
      await photosApi.uploadToR2(upload_url, blob, blob.type);
      setProgress(80);

      // Step 3: Confirm the upload with the backend
      setStatus("confirming");
      const photo = await photosApi.confirmUpload(eventId, deviceToken, {
        r2_key,
        file_name: fileName,
        file_size_bytes: blob.size,
        mime_type: blob.type,
      });
      setProgress(100);
      setStatus("success");
      return photo;
    } catch (err: any) {
      const message =
        err.response?.data?.detail ?? err.message ?? "Upload failed. Please try again.";
      setError(message);
      setStatus("error");
      return null;
    }
  };

  const reset = () => { setStatus("idle"); setError(null); setProgress(0); };

  return { upload, status, progress, error, reset, isLoading: status !== "idle" && status !== "success" && status !== "error" };
}
