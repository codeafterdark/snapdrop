import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/admin/LoginPage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { NewEventPage } from "@/pages/admin/NewEventPage";
import { EventDetailPage } from "@/pages/admin/EventDetailPage";
import { JoinPage } from "@/pages/attendee/JoinPage";
import { CameraPage } from "@/pages/attendee/CameraPage";
import { ThankYouPage } from "@/pages/attendee/ThankYouPage";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/admin/dashboard" replace /> },

  // Admin routes (protected)
  { path: "/admin/login", element: <LoginPage /> },
  {
    path: "/admin/dashboard",
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: "/admin/events/new",
    element: <ProtectedRoute><NewEventPage /></ProtectedRoute>,
  },
  {
    path: "/admin/events/:eventId",
    element: <ProtectedRoute><EventDetailPage /></ProtectedRoute>,
  },

  // Attendee routes (public)
  { path: "/e/:slug", element: <JoinPage /> },
  { path: "/e/:slug/camera", element: <CameraPage /> },
  { path: "/e/:slug/done", element: <ThankYouPage /> },

  // Catch-all
  { path: "*", element: <Navigate to="/" replace /> },
]);
