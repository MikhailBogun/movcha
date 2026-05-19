import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { login as apiLogin, register as apiRegister } from "../api/client";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("token"),
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (token && raw) {
      try {
        const user: User = JSON.parse(raw);
        setState({ user, token, isLoading: false });
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setState({ user: null, token: null, isLoading: false });
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokenData = await apiLogin(email, password);
    localStorage.setItem("token", tokenData.access_token);

    // Fetch user profile using the token we just received
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!res.ok) throw new Error("Failed to load user profile");
    const user: User = await res.json();

    localStorage.setItem("user", JSON.stringify(user));
    setState({ user, token: tokenData.access_token, isLoading: false });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await apiRegister(email, password);
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setState({ user: null, token: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
