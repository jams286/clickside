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

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const isDueSoon = dueDate && !isOverdue && dueDate <= sevenDaysFromNow && task.status.type !== "closed";

  const edgeColor = !dueDate ? "#7b68ee" : isOverdue ? "#f45b69" : isDueSoon ? "#f0ad4e" : "#49cc90";

  const priorityLabel = task.priority ? PRIORITY_LABELS[task.priority.id] || task.priority.priority : null;

  return (
    <div
      onDoubleClick={onDoubleClick}
      className="my-3 px-5 py-4 rounded-lg bg-surface-raised border border-border shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.99] border-l-4"
      style={{ marginLeft: '4px', marginRight: '4px', marginTop: '4px', marginBottom: '4px', paddingLeft: '12px', borderLeftColor: edgeColor }}
    >
      <div className="flex items-start gap-3">
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
