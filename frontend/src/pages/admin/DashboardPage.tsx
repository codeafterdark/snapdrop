import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@/api/events";
import { useAuth } from "@/hooks/useAuth";
import { EventCard } from "@/components/admin/EventCard";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => eventsApi.list(),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">SnapDrop</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{profile?.email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
          <Button onClick={() => navigate("/admin/events/new")}>
            + New Event
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : !data?.items.length ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-gray-700 font-medium mb-2">No events yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first event to start collecting photos.</p>
            <Button onClick={() => navigate("/admin/events/new")}>Create first event</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.items.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </main>
    </div>
  );
}
