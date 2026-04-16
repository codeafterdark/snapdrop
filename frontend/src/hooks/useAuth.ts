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

  const signInWithGoogle = (redirectTo?: string) =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo ?? `${window.location.origin}/admin/dashboard` },
    });

  const signInWithApple = (redirectTo?: string) =>
    supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: redirectTo ?? `${window.location.origin}/admin/dashboard` },
    });

  const signOut = () => supabase.auth.signOut().then(() => clear());

  return { session, profile, loading, signInWithGoogle, signInWithApple, signOut };
}
