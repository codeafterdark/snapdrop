import { CollaboratorPublic, collaboratorsApi } from "@/api/collaborators";
import { Button } from "@/components/common/Button";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useState } from "react";

interface CollaboratorsListProps {
  eventId: string;
  collaborators: CollaboratorPublic[];
  isOwner: boolean;
}

export function CollaboratorsList({ eventId, collaborators, isOwner }: CollaboratorsListProps) {
  const qc = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (collab: CollaboratorPublic) => {
    setRemovingId(collab.id);
    try {
      await collaboratorsApi.remove(eventId, collab.id);
      qc.invalidateQueries({ queryKey: ["collaborators", eventId] });
      toast.success("Access removed");
    } catch {
      toast.error("Failed to remove collaborator");
    } finally {
      setRemovingId(null);
    }
  };

  if (!collaborators.length) {
    return <p className="text-sm text-gray-400">No co-admins invited yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {collaborators.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {c.avatar_url ? (
              <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {(c.display_name ?? c.invited_email)[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              {c.display_name && <p className="text-sm font-medium text-gray-800 truncate">{c.display_name}</p>}
              <p className="text-xs text-gray-500 truncate">{c.invited_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              c.status === "accepted"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {c.status === "accepted" ? "Active" : "Pending"}
            </span>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                loading={removingId === c.id}
                onClick={() => handleRemove(c)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                Remove
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
