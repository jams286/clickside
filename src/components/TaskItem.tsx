import { Task } from "../services/clickup";
import StatusBadge from "./StatusBadge";
import { Clock } from "lucide-react";

interface Props {
  task: Task;
  onDoubleClick: () => void;
}

export default function TaskItem({ task, onDoubleClick }: Props) {
  const dueDate = task.due_date
    ? new Date(parseInt(task.due_date))
    : null;

  const isOverdue = dueDate && dueDate < new Date() && task.status.type !== "closed";

  return (
    <div
      onDoubleClick={onDoubleClick}
      className="px-5 py-6 hover:bg-surface-raised/50 cursor-pointer transition-colors active:bg-surface-raised"
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className="mt-1.5 shrink-0">
          <span
            className="block w-2 h-2 rounded-full"
            style={{
              backgroundColor: task.priority?.color || "#6b7280",
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Task name */}
          <p className="text-sm text-text font-medium leading-snug truncate">
            {task.name}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={task.status} size="sm" />

            {dueDate && (
              <span
                className={`flex items-center gap-1 text-[10px] ${
                  isOverdue ? "text-danger" : "text-text-muted"
                }`}
              >
                <Clock className="w-3 h-3" />
                {dueDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}

            <span className="text-[10px] text-text-muted truncate ml-auto">
              {task.list.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
