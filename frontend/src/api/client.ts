import axios from "axios";
import { supabase } from "@/lib/supabase";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Attach Supabase JWT on every request
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Redirect to login on 401
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
