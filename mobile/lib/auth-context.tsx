import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchQuotaSummary } from "./api";
import { setAdminToken } from "./admin-unlock";
import { API_BASE_URL } from "./config";
import { getSupabase } from "./supabase";
import type { QuotaSummary, UserTier } from "./types";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  tier: UserTier | null;
  quota: QuotaSummary | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Dev only: sign in as the admin account by typing the admin code (local API). */
  signInWithAdminCode: (code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshQuota: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [quota, setQuota] = useState<QuotaSummary | null>(null);

  const refreshQuota = useCallback(async () => {
    try {
      const q = await fetchQuotaSummary();
      setQuota(q);
    } catch {
      setQuota(null);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) void refreshQuota();
    else setQuota(null);
  }, [session, refreshQuota]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signInWithAdminCode = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/dev-code-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        access_token?: string;
        refresh_token?: string;
        adminToken?: string;
      };
      if (!res.ok || !body.access_token || !body.refresh_token) {
        return body.error ?? `Sign-in failed (${res.status})`;
      }
      if (body.adminToken) await setAdminToken(body.adminToken);
      const { error } = await getSupabase().auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
      return error?.message ?? null;
    } catch {
      return `Cannot reach API at ${API_BASE_URL}`;
    }
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setQuota(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      tier: quota?.tier ?? null,
      quota,
      signIn,
      signInWithAdminCode,
      signOut,
      refreshQuota,
    }),
    [loading, session, quota, signIn, signInWithAdminCode, signOut, refreshQuota],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
