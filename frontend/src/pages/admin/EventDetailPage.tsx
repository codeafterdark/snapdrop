import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@/api/events";
import { photosApi } from "@/api/photos";
import { GalleryGrid } from "@/components/admin/GalleryGrid";
import { QRModal } from "@/components/admin/QRModal";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { formatDate, formatBytes, getEventStatus } from "@/lib/utils";
import toast from "react-hot-toast";

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.get(eventId!),
    enabled: !!eventId,
  });

  const { data: stats } = useQuery({
    queryKey: ["event-stats", eventId],
    queryFn: () => eventsApi.stats(eventId!),
    enabled: !!eventId,
  });

  const { data: photosData, isLoading: photosLoading, error: photosError } = useQuery({
    queryKey: ["photos", eventId],
    queryFn: () => photosApi.list(eventId!),
    enabled: !!eventId,
  });

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const resp = await photosApi.downloadZip(eventId!);
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snapdrop-${event?.name?.replace(/\s+/g, "-").toLowerCase()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(detail ?? "Failed to download photos");
    } finally {
      setDownloading(false);
    }
  };

  if (eventLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!event) return <div className="p-8 text-center text-gray-500">Event not found</div>;

  const status = getEventStatus(event.starts_at, event.ends_at);
  const capExceeded = photosError && (photosError as any)?.response?.data?.detail === "attendee_cap_exceeded";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard")} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="font-bold text-gray-900 truncate flex-1">{event.name}</h1>
          <button onClick={() => setShowQR(true)} title="View QR Code" className="p-2 text-gray-400 hover:text-brand-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Event meta */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Status" value={<span className={`capitalize font-medium ${status === "active" ? "text-green-600" : status === "upcoming" ? "text-blue-600" : "text-gray-500"}`}>{status}</span>} />
          <StatCard label="Dates" value={`${formatDate(event.starts_at)} – ${formatDate(event.ends_at)}`} />
          <StatCard label="Attendees" value={`${stats?.attendee_count ?? "—"} / ${event.attendee_cap === 999999 ? "∞" : event.attendee_cap}`} />
          <StatCard label="Photos" value={`${stats?.photo_count ?? "—"} (${formatBytes(stats?.storage_bytes ?? 0)})`} />
        </div>

        {/* Attendee cap exceeded banner */}
        {capExceeded && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-semibold text-amber-800 mb-1">Attendee cap exceeded</h3>
            <p className="text-amber-700 text-sm">
              This event has more attendees than your current plan allows. Upgrade your plan to view and download photos.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleDownloadZip} loading={downloading} disabled={!photosData?.total || capExceeded}>
            Download all photos (ZIP)
          </Button>
        </div>

        {/* Gallery */}
        {photosLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <GalleryGrid photos={photosData?.items ?? []} eventId={eventId!} />
        )}
      </main>

      <QRModal
        open={showQR}
        onClose={() => setShowQR(false)}
        qrCodeUrl={event.qr_code_url}
        joinUrl={event.join_url}
        eventName={event.name}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
