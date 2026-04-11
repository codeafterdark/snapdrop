import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EventListItem, eventsApi } from "@/api/events";
import { formatDate, getEventStatus } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_STYLES = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

export function EventCard({ event }: { event: EventListItem }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = getEventStatus(event.starts_at, event.ends_at);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await eventsApi.delete(event.id);
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg leading-tight">{event.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(event.starts_at)} → {formatDate(event.ends_at)}
            </p>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[status]}`}>
            {status}
          </span>
        </div>

        <div className="text-xs text-gray-400">
          Cap: {event.attendee_cap === 999999 ? "Unlimited" : event.attendee_cap} attendees
        </div>

        <div className="flex gap-2 mt-1">
          <Button size="sm" onClick={() => navigate(`/admin/events/${event.id}`)}>
            View Gallery
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowDeleteModal(true)}>
            Delete
          </Button>
        </div>
      </div>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete event?">
        <p className="text-sm text-gray-600 mb-6">
          This will permanently delete <strong>{event.name}</strong> and all its photos from storage. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete event</Button>
        </div>
      </Modal>
    </>
  );
}
