import { Status } from "../services/clickup";

interface Props {
  status: Status;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: Props) {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium capitalize ${sizeClasses}`}
      style={{
        backgroundColor: `${status.color}20`,
        color: status.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: status.color }}
      />
      {status.status}
    </span>
  );
}
