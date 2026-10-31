import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Set EXPO_PUBLIC_API_BASE to your backend. Expected endpoints:
//   POST {API_BASE}/auth/login     {phone, password}            -> {token, user:{name,phone}}
//   POST {API_BASE}/auth/register  {fullname, phone, password}  -> {token, user:{name,phone}}
// Empty API_BASE = built-in demo (mock) auth.
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE ?? "").replace(/\/$/, "");
const KEY = "mini_shop_auth";

export type Session = { token: string; user: { name: string; phone: string } };

async function call(path: string, body: Record<string, string>): Promise<Session> {
  if (!API_BASE) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      token: `demo.${body.phone}.${Date.now()}`,
      user: { phone: body.phone, name: body.fullname || "សុវណ្ណារី" },
    };
  }
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(data.message || "request_failed");
  return { token: data.token, user: data.user ?? { phone: body.phone, name: body.fullname ?? "" } };
}

type AuthCtx = {
  session: Session | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (fullname: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  headers: () => Record<string, string>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSession(JSON.parse(raw)))
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback(async (s: Session | null) => {
    setSession(s);
    if (s) await AsyncStorage.setItem(KEY, JSON.stringify(s));
    else await AsyncStorage.removeItem(KEY);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      ready,
      login: async (phone, password) => persist(await call("/auth/login", { phone, password })),
      register: async (fullname, phone, password) =>
        persist(await call("/auth/register", { fullname, phone, password })),
      logout: () => persist(null),
      headers: (): Record<string, string> => (session ? { Authorization: `Bearer ${session.token}` } : {}),
    }),
    [session, ready, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};
