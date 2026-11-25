"use client";

// Sesión de la cuenta. Pregunta al servidor quién es la persona al abrir la
// app y ofrece entrar, crear cuenta y salir. La cookie de sesión es httpOnly:
// el navegador la manda sola y el código de la página nunca la ve.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  specialty: string | null;
}

type Status = "loading" | "anon" | "authed";

interface AuthContextValue {
  status: Status;
  user: AccountUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    specialty?: string;
    email: string;
    password: string;
    acceptPrivacy: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  /** Marca la sesión como terminada (p. ej. el servidor respondió 401). */
  sessionLost: () => void;
  updateProfile: (input: { name: string; specialty?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function call<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Algo salió mal. Intenta de nuevo.");
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    call<{ user: AccountUser | null }>("/api/auth/me", "GET")
      .then(({ user: u }) => {
        setUser(u);
        setStatus(u ? "authed" : "anon");
      })
      .catch(() => setStatus("anon"));
  }, []);

  const sessionLost = useCallback(() => {
    setUser(null);
    setStatus("anon");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async login(email, password) {
        const { user: u } = await call<{ user: AccountUser }>("/api/auth/login", "POST", { email, password });
        setUser(u);
        setStatus("authed");
      },
      async register(input) {
        const { user: u } = await call<{ user: AccountUser }>("/api/auth/register", "POST", input);
        setUser(u);
        setStatus("authed");
      },
      async logout() {
        await call("/api/auth/logout", "POST", {}).catch(() => undefined);
        sessionLost();
      },
      sessionLost,
      async updateProfile(input) {
        const { user: u } = await call<{ user: AccountUser }>("/api/auth/me", "PATCH", input);
        setUser(u);
      },
      async changePassword(currentPassword, newPassword) {
        await call("/api/auth/password", "POST", { currentPassword, newPassword });
      },
      async deleteAccount(password) {
        await call("/api/account", "DELETE", { password });
        sessionLost();
      },
    }),
    [status, user, sessionLost]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** `null` en la versión de prueba (sin cuentas). */
export function useAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
