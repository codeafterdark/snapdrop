import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "@/api/events";
import { Button } from "@/components/common/Button";
import { QRModal } from "@/components/admin/QRModal";
import toast from "react-hot-toast";
import { format, addDays } from "date-fns";

function toLocalDatetimeValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function NewEventPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const now = new Date();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalDatetimeValue(now));
  const [endsAt, setEndsAt] = useState(toLocalDatetimeValue(addDays(now, 1)));
  const [attendeeCap, setAttendeeCap] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdEvent, setCreatedEvent] = useState<Awaited<ReturnType<typeof eventsApi.create>> | null>(null);
  const [showQR, setShowQR] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Event name is required";
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (end <= start) e.endsAt = "End date must be after start date";
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 14) e.endsAt = "Event duration cannot exceed 14 days";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const event = await eventsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        attendee_cap: attendeeCap,
      });
      qc.invalidateQueries({ queryKey: ["events"] });
      setCreatedEvent(event);
      setShowQR(true);
      toast.success("Event created!");
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? "Failed to create event";
      toast.error(Array.isArray(msg) ? msg[0]?.msg ?? "Validation error" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard")} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h1 className="font-bold text-gray-900">Create Event</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah & Tom's Wedding"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional event description"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time *</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.endsAt && <p className="text-red-600 text-xs mt-1">{errors.endsAt}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attendee Limit</label>
            <select
              value={attendeeCap}
              onChange={(e) => setAttendeeCap(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {[20, 50, 100, 150, 200].map((n) => (
                <option key={n} value={n}>{n} attendees</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-400">Max event duration: 14 days. Photos deleted 30 days after event end.</p>

          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Create Event
          </Button>
        </form>
      </main>

      {createdEvent && (
        <QRModal
          open={showQR}
          onClose={() => { setShowQR(false); navigate(`/admin/events/${createdEvent.id}`); }}
          qrCodeUrl={createdEvent.qr_code_url}
          joinUrl={createdEvent.join_url}
          eventName={createdEvent.name}
        />
      )}
    </div>
  );
}
