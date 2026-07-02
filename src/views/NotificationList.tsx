import { useQuery } from "@tanstack/react-query";
import { getNotifications, Notification } from "../services/clickup";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Bell, ExternalLink, MessageSquare } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - parseInt(timestamp);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  onBack: () => void;
  onOpenTask: (taskId: string) => void;
}

export default function NotificationList({ onBack, onOpenTask }: Props) {
  const { user, workspaces } = useAuth();
  const teamId = workspaces[0]?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", teamId, user?.id],
    queryFn: () => getNotifications(teamId, user!.id),
    enabled: !!teamId && !!user,
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const notifications = data?.notifications ?? [];

  const handleClickNotification = (notification: Notification) => {
    if (notification.task?.id) {
      onOpenTask(notification.task.id);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-border bg-surface-raised" data-tauri-drag-region>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-text-muted" />
            </button>
            <Bell className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text">Notifications</span>
            {notifications.length > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-danger rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </div>
          <button
            onClick={() => openUrl(`https://app.clickup.com/${teamId}/notifications`)}
            className="p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted"
            title="Open Inbox in ClickUp"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Notification List */}
      <main className="flex-1 overflow-y-auto" style={{ padding: "0 24px" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Bell className="w-5 h-5 text-primary animate-pulse" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
            <Bell className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className="w-full px-3 py-3 text-left hover:bg-surface-overlay transition-colors flex gap-3"
              >
                {/* Icon */}
                <div className="shrink-0 pt-0.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: n.user?.color || "#7b68ee" }}
                  >
                    {n.user?.initials || "?"}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted leading-tight">
                    <span className="font-medium text-text">
                      {n.user?.username || "Someone"}
                    </span>{" "}
                    commented
                  </p>
                  {n.task?.name && (
                    <p className="text-xs text-text font-medium mt-0.5 truncate">
                      {n.task.name}
                    </p>
                  )}
                  {n.comment_text && (
                    <p className="text-[11px] text-text-muted mt-1 line-clamp-2 flex items-start gap-1">
                      <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                      <span className="truncate">{n.comment_text}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-text-muted mt-1">
                    {formatTimeAgo(n.date)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
