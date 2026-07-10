import { useState } from "react";
import { validateToken, getWorkspaces } from "../services/clickup";
import { addAccount, StoredAccount } from "../services/store";
import { useAuth } from "../context/AuthContext";
import { KeyRound, Loader2, AlertCircle, ArrowLeft } from "lucide-react";

interface Props {
  onBack?: () => void;
}

export default function SetupScreen({ onBack }: Props) {
  const { login } = useAuth();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const result = await validateToken(trimmed);
      if (!result) {
        setError("Invalid token. Please check and try again.");
        setLoading(false);
        return;
      }

      // Store account so getWorkspaces can authenticate
      const tempAccount: StoredAccount = {
        id: String(result.user.id),
        token: trimmed,
        userName: result.user.username || result.user.email,
        email: result.user.email,
        color: result.user.color || "#7b68ee",
        initials: result.user.initials || result.user.username?.charAt(0)?.toUpperCase() || "?",
      };
      await addAccount(tempAccount);

      const { teams } = await getWorkspaces();
      await login(trimmed, result.user, teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 bg-surface">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 rounded-md hover:bg-surface-overlay transition-colors text-text-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-text">{onBack ? "Add Account" : "Welcome to ClickSide"}</h1>
          <p className="text-sm text-text-muted mt-2 text-center">
            Enter your ClickUp personal API token to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              API Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="pk_..."
              className="w-full px-3 py-2.5 rounded-lg bg-surface-raised border border-border text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </button>
        </form>

        <p className="text-xs text-text-muted mt-6 text-center leading-relaxed">
          Find your token in ClickUp → Settings → Apps → API Token
        </p>
      </div>
    </div>
  );
}
