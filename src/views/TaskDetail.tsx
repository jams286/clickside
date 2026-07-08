import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTask,
  getTaskComments,
  createTaskComment,
  createTaskAttachment,
  updateTaskStatus,
  getStatuses,
  getRunningTimer,
  startTimer,
  stopTimer,
  Comment,
  Status,
  Attachment,
} from "../services/clickup";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  Tag,
  MessageSquare,
  ChevronDown,
  ExternalLink,
  Play,
  Square,
  Timer,
  Paperclip,
  FileText,
  Image,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import CommentBubble from "../components/CommentBubble";
import StatusBadge from "../components/StatusBadge";
import MentionInput from "../components/MentionInput";
import { useAuth } from "../context/AuthContext";

function isImageExtension(ext: string): boolean {
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(
    ext?.toLowerCase()
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  taskId: string;
  onBack: () => void;
}

export default function TaskDetail({ taskId, onBack }: Props) {
  const queryClient = useQueryClient();
  const { workspaces } = useAuth();
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const members = workspaces[0]?.members?.map((m) => m.user) ?? [];
  const teamId = workspaces[0]?.id;

  // Timer state
  const [elapsed, setElapsed] = useState("");

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
  });

  const { data: commentsData } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => getTaskComments(taskId),
  });

  const { data: statusesData } = useQuery({
    queryKey: ["statuses", task?.list?.id],
    queryFn: () => getStatuses(task!.list.id),
    enabled: !!task?.list?.id,
  });

  const commentMutation = useMutation({
    mutationFn: async ({ text, mentions, files }: { text: string; mentions: { id: number; startIndex: number; endIndex: number }[]; files: File[] }) => {
      // Upload attachments first
      for (const file of files) {
        await createTaskAttachment(taskId, file);
      }
      // Then post the comment text (if any)
      if (text.trim()) {
        await createTaskComment(taskId, text, mentions);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
    onError: (err: Error) => {
      console.error("Comment/attachment failed:", err);
      alert(`Failed: ${err.message}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowStatusPicker(false);
    },
  });

  // Time tracking
  const [timerError, setTimerError] = useState<string | null>(null);

  const { data: timerData } = useQuery({
    queryKey: ["timer", teamId],
    queryFn: () => getRunningTimer(teamId),
    enabled: !!teamId,
    refetchInterval: 10000,
  });

  const runningTimer = timerData?.data;
  const isTimerRunningForThis = runningTimer?.task?.id === taskId;
  const isTimerRunningForOther = runningTimer && !isTimerRunningForThis;

  const startMutation = useMutation({
    mutationFn: () => startTimer(teamId, taskId),
    onSuccess: () => {
      setTimerError(null);
      queryClient.invalidateQueries({ queryKey: ["timer"] });
    },
    onError: (err: Error) => {
      console.error("Start timer failed:", err);
      setTimerError(err.message);
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => stopTimer(teamId),
    onSuccess: () => {
      setTimerError(null);
      queryClient.invalidateQueries({ queryKey: ["timer"] });
      setElapsed("");
    },
    onError: (err: Error) => {
      console.error("Stop timer failed:", err);
      setTimerError(err.message);
    },
  });

  // Update elapsed display every second when timer is running
  useEffect(() => {
    if (!isTimerRunningForThis || !runningTimer) {
      setElapsed("");
      return;
    }
    const startMs = parseInt(runningTimer.start);
    const update = () => {
      const diff = Date.now() - startMs;
      const secs = Math.floor(diff / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${m}:${String(s).padStart(2, "0")}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isTimerRunningForThis, runningTimer]);

  const handleSendComment = (text: string, mentions: { id: number; startIndex: number; endIndex: number }[], files: File[]) => {
    commentMutation.mutate({ text, mentions, files });
  };

  if (taskLoading || !task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const comments = commentsData?.comments ?? [];
  const statuses = statusesData?.statuses ?? [];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="shrink-0 px-3 py-2.5 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-text-muted" />
          </button>
          <span className="text-xs text-text-muted truncate flex-1">
            {task.folder.name && task.folder.name !== "hidden"
              ? `${task.folder.name} / ${task.list.name}`
              : task.list.name}
          </span>
          <button
            onClick={() => openUrl(task.url)}
            className="p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Open in ClickUp"
          >
            <ExternalLink className="w-5 h-5 text-text-muted" />
          </button>
        </div>
      </header>

      {/* Task Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 24px' }}>
        {/* Title & Status */}
        <div className="pt-5 pb-4">
          <h1 className="text-base font-semibold text-text leading-snug mb-3">
            {task.name}
          </h1>

          {/* Status */}
          <div className="relative">
            <button
              onClick={() => setShowStatusPicker(!showStatusPicker)}
              className="flex items-center gap-1.5 group"
            >
              <StatusBadge status={task.status} />
              <ChevronDown className="w-3 h-3 text-text-muted group-hover:text-text transition-colors" />
            </button>

            {showStatusPicker && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-surface-raised border border-border rounded-lg shadow-lg z-10 min-w-[160px]">
                {statuses.map((s: Status) => (
                  <button
                    key={s.status}
                    onClick={() => statusMutation.mutate(s.status)}
                    className="w-full px-3 py-1.5 text-left hover:bg-surface-overlay transition-colors flex items-center gap-2"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs text-text capitalize">{s.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="pb-4 space-y-2.5">
          {task.priority && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: task.priority.color }}
              />
              <span className="capitalize">{task.priority.priority} Priority</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Clock className="w-3.5 h-3.5" />
              <span>Due {new Date(parseInt(task.due_date)).toLocaleDateString()}</span>
            </div>
          )}

          {/* Time tracker */}
          <div className="flex items-center gap-2">
            {isTimerRunningForThis ? (
              <button
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                className="flex items-center gap-3 rounded-lg bg-danger/15 border border-danger/30 hover:bg-danger/25 transition-colors"
                style={{ padding: "10px 28px", minHeight: "44px" }}
              >
                <Square className="w-4 h-4 text-danger fill-danger" />
                <Timer className="w-4 h-4 text-danger" />
                <span className="text-sm font-mono text-danger font-medium">
                  {elapsed}
                </span>
              </button>
            ) : (
              <button
                onClick={() => { setTimerError(null); startMutation.mutate(); }}
                disabled={startMutation.isPending}
                className="flex items-center gap-3 rounded-lg bg-success/15 border border-success/30 hover:bg-success/25 transition-colors"
                style={{ padding: "10px 28px", minHeight: "44px" }}
                title={
                  isTimerRunningForOther
                    ? `Timer running on: ${runningTimer?.task?.name ?? "another task"}. Starting will stop it.`
                    : "Start tracking time"
                }
              >
                <Play className="w-4 h-4 text-success fill-success" />
                <span className="text-sm text-success font-medium">
                  {startMutation.isPending ? "Starting..." : isTimerRunningForOther ? "Start (stops other)" : "Start timer"}
                </span>
              </button>
            )}
          </div>
          {timerError && (
            <p className="text-xs text-danger">{timerError}</p>
          )}

          {task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-text-muted" />
              {task.tags.map((tag) => (
                <span
                  key={tag.name}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: tag.tag_bg, color: tag.tag_fg }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div className="pb-5 border-b border-border">
            <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap break-all">
              {task.description}
            </p>
          </div>
        )}

        {/* Attachments */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="py-4 border-b border-border">
            <div className="flex items-center gap-1.5 mb-3">
              <Paperclip className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs font-medium text-text-muted">
                Attachments ({task.attachments.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {task.attachments.map((attachment: Attachment) => (
                <button
                  key={attachment.id}
                  onClick={() => invoke("download_and_open", { url: attachment.url, filename: attachment.title })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-overlay transition-colors text-left group"
                  title={`Open ${attachment.title}`}
                >
                  {isImageExtension(attachment.extension) ? (
                    <Image className="w-4 h-4 text-text-muted shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                  <span className="text-xs text-text truncate flex-1">
                    {attachment.title}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {formatFileSize(attachment.size)}
                  </span>
                  <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="py-4">
          <div className="flex items-center gap-1.5 mb-4">
            <MessageSquare className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs font-medium text-text-muted">
              Comments ({comments.length})
            </span>
          </div>

          <div className="space-y-3">
            {comments.map((comment: Comment) => (
              <CommentBubble key={comment.id} comment={comment} />
            ))}
          </div>
        </div>
      </div>

      {/* Comment Input */}
      <MentionInput
        members={members}
        onSend={handleSendComment}
        disabled={commentMutation.isPending}
      />
    </div>
  );
}
