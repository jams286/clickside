import { Comment } from "../services/clickup";

interface Props {
  comment: Comment;
}

export default function CommentBubble({ comment }: Props) {
  const date = new Date(parseInt(comment.date));
  const text =
    comment.comment_text ||
    comment.comment?.map((c) => c.text || "").join("") ||
    "";

  return (
    <div className="flex gap-2">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
        style={{ backgroundColor: comment.user.color || "#7b68ee" }}
      >
        {comment.user.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-text">
            {comment.user.username}
          </span>
          <span className="text-[10px] text-text-muted">
            {date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
          {text}
        </p>
      </div>
    </div>
  );
}
