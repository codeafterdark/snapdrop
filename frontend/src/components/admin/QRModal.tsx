import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import toast from "react-hot-toast";

interface QRModalProps {
  open: boolean;
  onClose: () => void;
  qrCodeUrl?: string;
  joinUrl: string;
  eventName: string;
}

export function QRModal({ open, onClose, qrCodeUrl, joinUrl, eventName }: QRModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl).then(() => toast.success("Link copied!"));
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `snapdrop-qr-${eventName.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  return (
    <Modal open={open} onClose={onClose} title="Event QR Code">
      <div className="flex flex-col items-center gap-5">
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="QR Code" className="w-52 h-52 rounded-xl border border-gray-100" />
        ) : (
          <div className="w-52 h-52 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            QR code unavailable
          </div>
        )}

        <div className="w-full bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Attendee join link</p>
          <p className="text-sm text-brand-700 font-mono break-all">{joinUrl}</p>
        </div>

        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1" onClick={handleCopy}>
            Copy Link
          </Button>
          <Button className="flex-1" onClick={handleDownload} disabled={!qrCodeUrl}>
            Download QR
          </Button>
        </div>
      </div>
    </Modal>
  );
}
