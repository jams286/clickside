import { getToken } from "./store";

const BASE_URL = "https://api.clickup.com/api/v2";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("No API token configured");

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ClickUp API error (${res.status}): ${error}`);
  }

  return res.json();
}

// --- Types ---

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
  initials: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: { user: ClickUpUser }[];
}

export interface Space {
  id: string;
  name: string;
  color: string;
  private: boolean;
}

export interface Status {
  id?: string;
  status: string;
  color: string;
  type: string;
  orderindex: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: Status;
  priority: { id: string; priority: string; color: string } | null;
  assignees: ClickUpUser[];
  due_date: string | null;
  date_created: string;
  date_updated: string;
  list: { id: string; name: string };
  folder: { id: string; name: string };
  space: { id: string };
  tags: { name: string; tag_fg: string; tag_bg: string }[];
  url: string;
  time_estimate: number | null;
}

export interface Comment {
  id: string;
  comment_text: string;
  comment: CommentContent[];
  user: ClickUpUser;
  date: string;
  resolved: boolean;
}

export interface CommentContent {
  text?: string;
  type?: string;
  attributes?: Record<string, unknown>;
}

// --- API Methods ---

export async function getAuthorizedUser(): Promise<{ user: ClickUpUser }> {
  return request("/user");
}

export async function getWorkspaces(): Promise<{ teams: Workspace[] }> {
  return request("/team");
}

export async function getSpaces(teamId: string): Promise<{ spaces: Space[] }> {
  return request(`/team/${teamId}/space?archived=false`);
}

export async function getFilteredTasks(
  teamId: string,
  assigneeId: number,
  options: {
    statuses?: string[];
    page?: number;
    subtasks?: boolean;
    include_closed?: boolean;
  } = {}
): Promise<{ tasks: Task[] }> {
  const params = new URLSearchParams();
  params.set("assignees[]", String(assigneeId));
  params.set("subtasks", String(options.subtasks ?? false));
  params.set("include_closed", String(options.include_closed ?? false));
  params.set("page", String(options.page ?? 0));
  params.set("order_by", "updated");
  params.set("reverse", "true");

  if (options.statuses) {
    options.statuses.forEach((s) => params.append("statuses[]", s));
  }

  return request(`/team/${teamId}/task?${params.toString()}`);
}

export async function getTask(taskId: string): Promise<Task> {
  return request(`/task/${taskId}?include_subtasks=true`);
}

export async function searchTaskById(taskId: string): Promise<Task | null> {
  try {
    // ClickUp task IDs can be prefixed with # or not - strip leading # if present
    const cleanId = taskId.replace(/^#/, "").trim();
    return await request<Task>(`/task/${cleanId}?include_subtasks=true`);
  } catch {
    return null;
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<Task> {
  return request(`/task/${taskId}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function updateTask(
  taskId: string,
  updates: Partial<{ name: string; description: string; priority: number; due_date: number }>
): Promise<Task> {
  return request(`/task/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function getTaskComments(
  taskId: string
): Promise<{ comments: Comment[] }> {
  return request(`/task/${taskId}/comment`);
}

export async function createTaskComment(
  taskId: string,
  commentText: string,
  mentions?: { id: number; startIndex: number; endIndex: number }[]
): Promise<unknown> {
  // If no mentions, send as structured comment with plain text
  if (!mentions || mentions.length === 0) {
    return request(`/task/${taskId}/comment`, {
      method: "POST",
      body: JSON.stringify({
        comment_text: commentText,
        notify_all: false,
      }),
    });
  }

  // Build structured comment array with mention tags
  const comment: Record<string, unknown>[] = [];
  let cursor = 0;

  // Sort mentions by position
  const sorted = [...mentions].sort((a, b) => a.startIndex - b.startIndex);

  for (const mention of sorted) {
    // Add text before the mention
    if (cursor < mention.startIndex) {
      comment.push({ text: commentText.slice(cursor, mention.startIndex) });
    }
    // Add the mention tag
    comment.push({ type: "tag", user: { id: mention.id } });
    cursor = mention.endIndex;
  }

  // Add remaining text after last mention
  if (cursor < commentText.length) {
    comment.push({ text: commentText.slice(cursor) });
  }

  return request(`/task/${taskId}/comment`, {
    method: "POST",
    body: JSON.stringify({ comment, notify_all: false }),
  });
}

export interface Attachment {
  id: string;
  url: string;
  title: string;
  extension: string;
  thumbnail_small?: string;
  thumbnail_large?: string;
  size: number;
}

export async function createTaskAttachment(
  taskId: string,
  file: File
): Promise<Attachment> {
  const token = await getToken();
  if (!token) throw new Error("No API token configured");

  const formData = new FormData();
  formData.append("attachment", file, file.name);

  const res = await fetch(`${BASE_URL}/task/${taskId}/attachment`, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ClickUp API error (${res.status}): ${error}`);
  }

  return res.json();
}

export async function getStatuses(listId: string): Promise<{ statuses: Status[] }> {
  const list = await request<{ statuses: Status[] }>(`/list/${listId}`);
  return { statuses: list.statuses };
}

export async function validateToken(token: string): Promise<{ user: ClickUpUser } | null> {
  try {
    const res = await fetch(`${BASE_URL}/user`, {
      headers: { Authorization: token, "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// --- Time Tracking ---

export interface TimeEntry {
  id: string;
  task: { id: string; name: string } | null;
  start: string;
  end: string;
  duration: string;
  user: ClickUpUser;
}

export async function getRunningTimer(
  teamId: string
): Promise<{ data: TimeEntry | null }> {
  try {
    const result = await request<{ data: TimeEntry | TimeEntry[] | null }>(
      `/team/${teamId}/time_entries/current`
    );
    // API may return a single object or an array; running entry has negative duration
    const d = result.data;
    if (!d) return { data: null };
    if (Array.isArray(d)) {
      const running = d.find((e) => parseInt(e.duration) < 0) ?? null;
      return { data: running };
    }
    // Single object
    if (parseInt(d.duration) < 0) return { data: d };
    return { data: null };
  } catch {
    // No running timer or API error - treat as no timer
    return { data: null };
  }
}

export async function startTimer(
  teamId: string,
  taskId: string
): Promise<{ data: TimeEntry }> {
  return request(`/team/${teamId}/time_entries/start`, {
    method: "POST",
    body: JSON.stringify({ tid: taskId }),
  });
}

export async function stopTimer(
  teamId: string
): Promise<{ data: TimeEntry }> {
  return request(`/team/${teamId}/time_entries/stop`, {
    method: "POST",
  });
}
