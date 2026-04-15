import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { collaboratorsApi } from "@/api/collaborators";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
}

export function InviteModal({ open, onClose, eventId }: InviteModalProps) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await collaboratorsApi.invite(eventId, email.trim());
      toast.success(`Invite sent to ${email.trim()}`);
      qc.invalidateQueries({ queryKey: ["collaborators", eventId] });
      setEmail("");
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? "Failed to send invite";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite co-admin">
      <p className="text-sm text-gray-500 mb-5">
        They'll receive an email with a link to accept. Co-admins can view the gallery,
        download photos, and delete individual photos.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Send Invite</Button>
        </div>
      </form>
    </Modal>
  );
}
