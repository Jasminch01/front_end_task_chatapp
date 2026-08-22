"use client";

/**
 * Session state: the token, the current user, and login/logout.
 *
 * `status` is a tri-state rather than a bare `user | null`. The difference between
 * "still checking a saved token" and "not signed in" is what stops the login screen
 * flashing on every refresh.
 *
 * The token lives in localStorage. That is an XSS exposure, accepted for the scope of
 * this exercise: the socket handshake needs the raw token in the browser anyway, so an
 * HttpOnly cookie would have to be mirrored into JS to be usable. A production build
 * would proxy the socket and keep the token server-side.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth as authApi } from "@/lib/api/endpoints";
import { setApiToken } from "@/lib/api/client";
import { closeSocket } from "@/lib/socket";
import type { User } from "@/types/chat";

const STORAGE_KEY = "pulse.token";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthValue = {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  login: (phone: string, name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function readStoredToken(): string | null {
  // Storage can be unavailable (private mode, blocked cookies) — degrade, don't throw.
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal: the session simply won't survive a refresh.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Boot: validate a saved token before rendering anything that assumes a session.
  useEffect(() => {
    const saved = readStoredToken();
    if (!saved) {
      // localStorage can't be read during render (this component server-renders first),
      // so resolving the boot state here is unavoidable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("anonymous");
      return;
    }

    setApiToken(saved);
    let cancelled = false;

    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setToken(saved);
        setStatus("authenticated");
      })
      .catch(() => {
        // Expired or rejected — clear it rather than leaving a half-signed-in UI.
        if (cancelled) return;
        writeStoredToken(null);
        setApiToken(null);
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (phone: string, name: string) => {
    const session = await authApi.login(phone, name);
    setApiToken(session.token);
    writeStoredToken(session.token);
    setToken(session.token);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    writeStoredToken(null);
    setApiToken(null);
    closeSocket();
    setToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({ status, user, token, login, logout }),
    [status, user, token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
