import { Task } from "../services/clickup";
import StatusBadge from "./StatusBadge";
import { Clock, Calendar, Flag } from "lucide-react";

interface Props {
  task: Task;
  spaceName?: string;
  onDoubleClick: () => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  "1": "Urgent",
  "2": "High",
  "3": "Normal",
  "4": "Low",
};

export default function TaskItem({ task, spaceName, onDoubleClick }: Props) {
  const dueDate = task.due_date
    ? new Date(parseInt(task.due_date))
    : null;

  const createdDate = new Date(parseInt(task.date_created));

  const isOverdue = dueDate && dueDate < new Date() && task.status.type !== "closed";

  const priorityLabel = task.priority ? PRIORITY_LABELS[task.priority.id] || task.priority.priority : null;

  return (
    <div
      onDoubleClick={onDoubleClick}
      className="px-5 py-6 hover:bg-surface-raised/50 cursor-pointer transition-colors active:bg-surface-raised"
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className="mt-0.5 shrink-0 self-center">
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
              {spaceName || (task.folder.name && task.folder.name !== "hidden"
                ? `${task.folder.name} / ${task.list.name}`
                : task.list.name)}
            </span>
          </div>

          {/* Detail row */}
          <div className="flex items-center gap-3 mt-1.5">
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: task.priority?.color || "#6b7280" }}
            >
              <Flag className="w-3 h-3" />
              {priorityLabel || "No priority"}
            </span>

            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <Calendar className="w-3 h-3" />
              Created {createdDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
