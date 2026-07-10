import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { ChevronDown, Plus, Trash2, Check } from "lucide-react";

interface Props {
  onAddAccount: () => void;
}

export default function AccountSwitcher({ onAddAccount }: Props) {
  const { user, accounts, switchAccount, removeAccount } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md hover:bg-surface-overlay transition-colors px-1.5 py-1"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: user?.color || "#7b68ee" }}
        >
          {user?.initials}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-surface-raised border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-xs text-text-muted px-2 py-1">Accounts</p>
          </div>
          <div className="py-1">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-surface-overlay transition-colors group"
              >
                <button
                  className="flex items-center gap-2 flex-1 min-w-0"
                  onClick={async () => {
                    queryClient.clear();
                    await switchAccount(acc.id);
                    setOpen(false);
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: acc.color || "#7b68ee" }}
                  >
                    {acc.initials}
                  </div>
                  <span className="text-xs text-text truncate">{acc.userName}</span>
                  {String(user?.id) === acc.id && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </button>
                {accounts.length > 1 && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      queryClient.clear();
                      await removeAccount(acc.id);
                    }}
                    className="p-1 rounded hover:bg-danger/20 text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-border p-1">
            <button
              onClick={() => {
                setOpen(false);
                onAddAccount();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-overlay transition-colors text-xs text-text-muted"
            >
              <Plus className="w-3.5 h-3.5" />
              Add account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
