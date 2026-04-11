import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { UserProfile } from "@/api/auth";

interface AuthState {
  session: Session | null;
  supabaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  supabaseUser: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, supabaseUser: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ session: null, supabaseUser: null, profile: null }),
}));
