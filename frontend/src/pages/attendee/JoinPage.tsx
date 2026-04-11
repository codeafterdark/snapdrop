import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@/api/events";
import { attendeesApi } from "@/api/attendees";
import { useAttendeeStore } from "@/stores/attendeeStore";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { formatDate } from "@/lib/utils";

export function JoinPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { deviceToken, displayName, eventSlug, initDeviceToken, setAttendeeInfo } = useAttendeeStore();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // If already joined this event, skip to camera
  useEffect(() => {
    if (displayName && eventSlug === slug) {
      navigate(`/e/${slug}/camera`, { replace: true });
    }
  }, [displayName, eventSlug, slug, navigate]);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event-public", slug],
    queryFn: () => eventsApi.getPublicBySlug(slug!),
    enabled: !!slug,
    retry: false,
  });

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setJoinError("");
    if (!name.trim()) { setNameError("Please enter your name to continue"); return; }

    const token = initDeviceToken();
    setJoining(true);
    try {
      const resp = await attendeesApi.join(slug!, token, name.trim());
      setAttendeeInfo(name.trim(), resp.attendee_id, slug!);
      navigate(`/e/${slug}/camera`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setJoinError(detail ?? "Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Event not found</h2>
          <p className="text-gray-500">This QR code link is invalid or the event has been removed.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const isBefore = now < new Date(event.starts_at);
  const isAfter = now > new Date(event.ends_at);

  if (isBefore) {
    return <StatusPage title="Event hasn't started yet" message={`Come back on ${formatDate(event.starts_at)}.`} eventName={event.name} />;
  }
  if (isAfter || !event.is_active) {
    return <StatusPage title="Event has ended" message="Photo submissions are closed." eventName={event.name} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-violet-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your name to start sharing photos</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Smith"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {nameError && <p className="text-red-600 text-sm mt-1" role="alert">{nameError}</p>}
          </div>

          {joinError && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2" role="alert">{joinError}</p>}

          <Button type="submit" loading={joining} className="w-full" size="lg">
            Continue →
          </Button>
        </form>
      </div>
    </div>
  );
}

function StatusPage({ title, message, eventName }: { title: string; message: string; eventName: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-violet-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-2">{eventName}</p>
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}
