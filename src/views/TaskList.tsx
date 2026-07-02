import { useQuery } from "@tanstack/react-query";
import { getFilteredTasks, getSpaces, searchTaskById, getTask, Task, Status } from "../services/clickup";
import { useAuth } from "../context/AuthContext";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { getFilters, setFilters as saveFilters, getSortOrder, setSortOrder as saveSortOrder } from "../services/store";
import TaskItem from "../components/TaskItem";
import TaskDetail from "./TaskDetail";
import NotificationList from "./NotificationList";
import NotificationPanel from "../components/NotificationPanel";
import { RefreshCw, LogOut, Filter, Check, Search, ArrowUpDown, X, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

export default function TaskList() {
  const { user, workspaces, logout } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{ task: Task; isAssignedToMe: boolean } | null>(null);
  const [searchError, setSearchError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sort state
  const [sortOrder, setSortOrderState] = useState<string>("updated");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Restore saved filters on mount
  useEffect(() => {
    getFilters().then((saved) => {
      if (saved.length > 0) setActiveStatuses(new Set(saved));
    });
  }, []);

  // Persist filters when they change
  const updateFilters = useCallback((next: Set<string>) => {
    setActiveStatuses(next);
    saveFilters(Array.from(next));
  }, []);

  // Restore saved sort order on mount
  useEffect(() => {
    getSortOrder().then((saved) => {
      if (saved) setSortOrderState(saved);
    });
  }, []);

  // Handle sort change
  const updateSortOrder = useCallback((order: string) => {
    setSortOrderState(order);
    saveSortOrder(order);
    setShowSortMenu(false);
  }, []);

  // Handle search
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const task = await searchTaskById(q);
      if (!task) {
        setSearchError("Task not found. Check the ID and try again.");
      } else {
        const isAssignedToMe = task.assignees.some((a) => a.id === user?.id);
        setSearchResult({ task, isAssignedToMe });
      }
    } catch {
      setSearchError("Failed to search. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, user?.id]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResult(null);
    setSearchError("");
    setShowSearch(false);
  }, []);

  const teamId = workspaces[0]?.id;

  // Fetch spaces to get space names for display
  const { data: spacesData } = useQuery({
    queryKey: ["spaces", teamId],
    queryFn: () => getSpaces(teamId),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  const spaceNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (spacesData?.spaces) {
      for (const s of spacesData.spaces) {
        map[s.id] = s.name;
      }
    }
    return map;
  }, [spacesData?.spaces]);

  // Always fetch all tasks including closed so we can filter client-side
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["tasks", teamId, user?.id],
    queryFn: () =>
      getFilteredTasks(teamId, user!.id, { include_closed: true }),
    enabled: !!teamId && !!user,
    refetchInterval: 60000,
  });

  // Extract unique statuses from tasks, preserving order
  const availableStatuses = useMemo(() => {
    if (!data?.tasks) return [];
    const seen = new Map<string, Status>();
    for (const task of data.tasks) {
      const key = task.status.status.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, task.status);
      }
    }
    return Array.from(seen.values());
  }, [data?.tasks]);

  // Filter tasks client-side
  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return [];
    let tasks = data.tasks;
    if (activeStatuses.size > 0) {
      tasks = tasks.filter((t) =>
        activeStatuses.has(t.status.status.toLowerCase())
      );
    }
    // Sort tasks
    const sorted = [...tasks];
    switch (sortOrder) {
      case "due_date":
        sorted.sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return parseInt(a.due_date) - parseInt(b.due_date);
        });
        break;
      case "created":
        sorted.sort((a, b) => parseInt(b.date_created) - parseInt(a.date_created));
        break;
      case "priority":
        sorted.sort((a, b) => {
          const pa = a.priority ? parseInt(a.priority.id) : 99;
          const pb = b.priority ? parseInt(b.priority.id) : 99;
          return pa - pb;
        });
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "project":
        sorted.sort((a, b) => {          const sa = spaceNames[a.space.id] || "";
          const sb = spaceNames[b.space.id] || "";
          const spaceCmp = sa.localeCompare(sb);
          if (spaceCmp !== 0) return spaceCmp;          const fa = a.folder.name === "hidden" ? "" : a.folder.name;
          const fb = b.folder.name === "hidden" ? "" : b.folder.name;
          const folderCmp = fa.localeCompare(fb);
          if (folderCmp !== 0) return folderCmp;
          return a.list.name.localeCompare(b.list.name);
        });
        break;
      case "updated":
      default:
        sorted.sort((a, b) => parseInt(b.date_updated) - parseInt(a.date_updated));
        break;
    }
    return sorted;
  }, [data?.tasks, activeStatuses, sortOrder]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    if (showFilterMenu || showSortMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterMenu, showSortMenu]);

  const toggleStatus = (status: string) => {
    const key = status.toLowerCase();
    const next = new Set(activeStatuses);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateFilters(next);
  };

  const clearFilters = () => {
    updateFilters(new Set());
    setShowFilterMenu(false);
  };

  if (showNotifications) {
    return (
      <NotificationList
        onBack={() => setShowNotifications(false)}
        onOpenTask={async (taskId) => {
          const task = await getTask(taskId);
          setSelectedTask(task);
          setShowNotifications(false);
        }}
      />
    );
  }

  if (selectedTask) {
    return (
      <TaskDetail
        taskId={selectedTask.id}
        onBack={() => setSelectedTask(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-border bg-surface-raised" data-tauri-drag-region>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: user?.color || "#7b68ee" }}
            >
              {user?.initials}
            </div>
            <span className="text-sm font-medium text-text truncate max-w-[120px]">
              My Tasks
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => refetch()}
              className="p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-text-muted ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <NotificationPanel
              onClick={() => setShowNotifications(true)}
            />
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${activeStatuses.size > 0 ? "text-primary" : "text-text-muted"}`}
                title="Filter by status"
              >
                <Filter className="w-5 h-5" />
                {activeStatuses.size > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                    {activeStatuses.size}
                  </span>
                )}
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-1 py-1 bg-surface-raised border border-border rounded-lg shadow-lg z-20 min-w-[180px]">
                  <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                      Filter by status
                    </span>
                    {activeStatuses.size > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {availableStatuses.map((s) => {
                    const key = s.status.toLowerCase();
                    const isActive = activeStatuses.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleStatus(s.status)}
                        className="w-full px-3 py-1.5 text-left hover:bg-surface-overlay transition-colors flex items-center gap-2"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-xs text-text capitalize flex-1">
                          {s.status}
                        </span>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${sortOrder !== "updated" ? "text-primary" : "text-text-muted"}`}
                title="Sort tasks"
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 py-1 bg-surface-raised border border-border rounded-lg shadow-lg z-20 min-w-[160px]">
                  <div className="px-3 py-1.5 border-b border-border">
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                      Sort by
                    </span>
                  </div>
                  {[
                    { key: "updated", label: "Last Updated" },
                    { key: "created", label: "Creation Date" },
                    { key: "due_date", label: "Due Date" },
                    { key: "priority", label: "Priority" },
                    { key: "project", label: "Project / List" },
                    { key: "name", label: "Name" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => updateSortOrder(opt.key)}
                      className="w-full px-3 py-1.5 text-left hover:bg-surface-overlay transition-colors flex items-center gap-2"
                    >
                      <span className="text-xs text-text flex-1">{opt.label}</span>
                      {sortOrder === opt.key && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setShowSearch(!showSearch); setTimeout(() => searchInputRef.current?.focus(), 50); }}
              className={`p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${showSearch ? "text-primary" : "text-text-muted"}`}
              title="Search by task ID"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="p-2.5 rounded-md hover:bg-surface-overlay transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      {showSearch && (
        <div className="shrink-0 px-4 py-2 border-b border-border bg-surface-raised">
          <div className="flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); if (e.key === "Escape") clearSearch(); }}
              placeholder="Enter task ID (e.g. abc123 or #abc123)"
              className="flex-1 px-3 py-1.5 rounded-md bg-surface border border-border text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary text-xs"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="px-3 py-1.5 text-xs rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              {searchLoading ? "..." : "Go"}
            </button>
            <button onClick={clearSearch} className="p-1 rounded-md hover:bg-surface-overlay transition-colors">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {searchError && (
            <p className="text-xs text-danger mt-1.5">{searchError}</p>
          )}

          {searchResult && (
            <div className="mt-2 p-2.5 rounded-md border border-border bg-surface">
              <p className="text-xs font-medium text-text truncate">{searchResult.task.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-text-muted">{searchResult.task.list.name}</span>
                <span className="text-[10px] text-text-muted">·</span>
                <span className="text-[10px] text-text-muted capitalize">{searchResult.task.status.status}</span>
              </div>
              {!searchResult.isAssignedToMe && (
                <p className="text-[10px] text-warning mt-1.5 font-medium">
                  This task is not assigned to you.
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {searchResult.isAssignedToMe ? (
                  <button
                    onClick={() => { setSelectedTask(searchResult.task); clearSearch(); }}
                    className="px-2.5 py-1 text-[10px] rounded-md bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    Open Task
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setSelectedTask(searchResult.task); clearSearch(); }}
                      className="px-2.5 py-1 text-[10px] rounded-md bg-surface-overlay text-text hover:bg-surface-raised transition-colors border border-border"
                    >
                      Open Anyway
                    </button>
                    <button
                      onClick={() => openUrl(searchResult.task.url)}
                      className="px-2.5 py-1 text-[10px] rounded-md bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in ClickUp
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      <main className="flex-1 overflow-y-auto" style={{ padding: '0 24px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : !filteredTasks.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
            <p className="text-sm">
              {activeStatuses.size > 0 ? "No tasks match the filter" : "No tasks assigned to you"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                spaceName={spaceNames[task.space.id]}
                onDoubleClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 px-4 py-2 border-t border-border bg-surface-raised">
        <p className="text-xs text-text-muted text-center">
          {filteredTasks.length}{activeStatuses.size > 0 ? `/${data?.tasks?.length ?? 0}` : ""} tasks · {workspaces[0]?.name}
        </p>
      </footer>
    </div>
  );
}
