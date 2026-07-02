import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../services/clickup";
import { useAuth } from "../context/AuthContext";
import { Bell } from "lucide-react";

interface Props {
  onClick: () => void;
}

export default function NotificationPanel({ onClick }: Props) {
  const { user, workspaces } = useAuth();
  const teamId = workspaces[0]?.id;

  const { data } = useQuery({
    queryKey: ["notifications", teamId, user?.id],
    queryFn: () => getNotifications(teamId, user!.id),
    enabled: !!teamId && !!user,
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const count = data?.notifications?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className="relative p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted"
      title="Notifications"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-danger rounded-full text-[9px] text-white flex items-center justify-center font-bold">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
