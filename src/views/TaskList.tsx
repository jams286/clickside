import { useQuery } from "@tanstack/react-query";
import { getFilteredTasks, Task, Status } from "../services/clickup";
import { useAuth } from "../context/AuthContext";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { getFilters, setFilters as saveFilters } from "../services/store";
import TaskItem from "../components/TaskItem";
import TaskDetail from "./TaskDetail";
import { RefreshCw, LogOut, Filter, Maximize2, Minimize2, Check } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function TaskList() {
  const { user, workspaces, logout } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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

  const teamId = workspaces[0]?.id;

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
    if (activeStatuses.size === 0) return data.tasks;
    return data.tasks.filter((t) =>
      activeStatuses.has(t.status.status.toLowerCase())
    );
  }, [data?.tasks, activeStatuses]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    if (showFilterMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterMenu]);

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

  const toggleMaximize = async () => {
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    if (maximized) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };

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
              className="p-1.5 rounded-md hover:bg-surface-overlay transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-text-muted ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`p-1.5 rounded-md hover:bg-surface-overlay transition-colors ${activeStatuses.size > 0 ? "text-primary" : "text-text-muted"}`}
                title="Filter by status"
              >
                <Filter className="w-4 h-4" />
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
            <button
              onClick={toggleMaximize}
              className="p-1.5 rounded-md hover:bg-surface-overlay transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4 text-text-muted" />
              ) : (
                <Maximize2 className="w-4 h-4 text-text-muted" />
              )}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-surface-overlay transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>
      </header>

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
