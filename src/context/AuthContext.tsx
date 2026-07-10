import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  getToken,
  clearToken,
  getAccounts,
  addAccount as storeAddAccount,
  removeAccount as storeRemoveAccount,
  setActiveAccountId,
  StoredAccount,
} from "../services/store";
import { getAuthorizedUser, getWorkspaces, ClickUpUser, Workspace } from "../services/clickup";

interface AuthState {
  token: string | null;
  user: ClickUpUser | null;
  workspaces: Workspace[];
  accounts: StoredAccount[];
  isLoading: boolean;
  login: (token: string, user: ClickUpUser, workspaces: Workspace[]) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<ClickUpUser | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getToken();
        const storedAccounts = await getAccounts();
        setAccounts(storedAccounts);
        if (stored) {
          const { user } = await getAuthorizedUser();
          const { teams } = await getWorkspaces();
          setTokenState(stored);
          setUser(user);
          setWorkspaces(teams);

          // Update migrated placeholder account with real user info
          if (storedAccounts.length > 0 && storedAccounts[0].id === "migrated") {
            const updated: StoredAccount = {
              id: String(user.id),
              token: stored,
              userName: user.username || user.email,
              email: user.email,
              color: user.color || "#7b68ee",
              initials: user.initials || user.username?.charAt(0)?.toUpperCase() || "?",
            };
            await storeAddAccount(updated);
            await storeRemoveAccount("migrated");
            setAccounts(await getAccounts());
          }
        }
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (token: string, user: ClickUpUser, workspaces: Workspace[]) => {
    const account: StoredAccount = {
      id: String(user.id),
      token,
      userName: user.username || user.email,
      email: user.email,
      color: user.color || "#7b68ee",
      initials: user.initials || user.username?.charAt(0)?.toUpperCase() || "?",
    };
    await storeAddAccount(account);
    setTokenState(token);
    setUser(user);
    setWorkspaces(workspaces);
    setAccounts(await getAccounts());
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
    setWorkspaces([]);
    setAccounts(await getAccounts());
  };

  const switchAccount = async (id: string) => {
    setIsLoading(true);
    try {
      await setActiveAccountId(id);
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
      setTokenState(null);
      setUser(null);
      setWorkspaces([]);
    } finally {
      setAccounts(await getAccounts());
      setIsLoading(false);
    }
  };

  const removeAccount = async (id: string) => {
    await storeRemoveAccount(id);
    const remaining = await getAccounts();
    setAccounts(remaining);
    // If we removed the active account, switch to first remaining or logout
    if (String(user?.id) === id) {
      if (remaining.length > 0) {
        await switchAccount(remaining[0].id);
      } else {
        setTokenState(null);
        setUser(null);
        setWorkspaces([]);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, workspaces, accounts, isLoading, login, logout, switchAccount, removeAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
