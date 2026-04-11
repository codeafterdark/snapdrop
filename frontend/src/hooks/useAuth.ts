import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth";

export function useAuth() {
  const { session, profile, loading, setSession, setProfile, setLoading, clear } = useAuthStore();

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        authApi.me().then(setProfile).catch(() => {}).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        authApi.me().then(setProfile).catch(() => {});
      } else {
        clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/admin/dashboard` } });

  const signInWithMicrosoft = () =>
    supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/admin/dashboard` } });

  const signInWithApple = () =>
    supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: `${window.location.origin}/admin/dashboard` } });

  const signOut = () => supabase.auth.signOut().then(() => clear());

  return { session, profile, loading, signInWithGoogle, signInWithMicrosoft, signInWithApple, signOut };
}
