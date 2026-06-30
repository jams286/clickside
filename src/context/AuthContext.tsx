import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getToken, setToken as storeToken, clearToken } from "../services/store";
import { getAuthorizedUser, getWorkspaces, ClickUpUser, Workspace } from "../services/clickup";

interface AuthState {
  token: string | null;
  user: ClickUpUser | null;
  workspaces: Workspace[];
  isLoading: boolean;
  login: (token: string, user: ClickUpUser, workspaces: Workspace[]) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<ClickUpUser | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getToken();
        if (stored) {
          const { user } = await getAuthorizedUser();
          const { teams } = await getWorkspaces();
          setTokenState(stored);
          setUser(user);
          setWorkspaces(teams);
        }
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (token: string, user: ClickUpUser, workspaces: Workspace[]) => {
    await storeToken(token);
    setTokenState(token);
    setUser(user);
    setWorkspaces(workspaces);
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
    setWorkspaces([]);
  };

  return (
    <AuthContext.Provider value={{ token, user, workspaces, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
