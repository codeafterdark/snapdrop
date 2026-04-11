import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/common/Button";

export function ThankYouPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-violet-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Photo submitted!</h2>
        <p className="text-gray-500 text-sm mb-8">Your photo has been shared with the event organizer.</p>

        <Button size="lg" className="w-full" onClick={() => navigate(`/e/${slug}/camera`)}>
          Take another photo
        </Button>
      </div>
    </div>
  );
}
