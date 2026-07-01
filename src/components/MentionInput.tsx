import { useState, useRef, useEffect, useCallback } from "react";
import { ClickUpUser } from "../services/clickup";
import { Send, Paperclip, X } from "lucide-react";

interface Mention {
  id: number;
  username: string;
  startIndex: number;
  endIndex: number;
}

interface Props {
  members: ClickUpUser[];
  onSend: (text: string, mentions: Mention[], files: File[]) => void;
  disabled?: boolean;
}

export default function MentionInput({ members, onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [queryStart, setQueryStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? members.filter((m) => {
        const name = m.username || m.email || "";
        return name.toLowerCase().includes(query.toLowerCase());
      })
    : members;

  const resetDropdown = useCallback(() => {
    setShowDropdown(false);
    setQuery("");
    setQueryStart(-1);
    setSelectedIndex(0);
  }, []);

  const insertMention = useCallback(
    (user: ClickUpUser) => {
      const before = value.slice(0, queryStart);
      const after = value.slice(textareaRef.current?.selectionStart ?? value.length);
      const mentionText = `@${user.username || user.email || "user"}`;
      const newValue = before + mentionText + " " + after;

      // Adjust existing mentions that come after insertion point
      const insertLen = mentionText.length + 1 - (value.length - before.length - after.length);
      const adjusted = mentions.map((m) => {
        if (m.startIndex >= queryStart) {
          return { ...m, startIndex: m.startIndex + insertLen, endIndex: m.endIndex + insertLen };
        }
        return m;
      });

      const newMention: Mention = {
        id: user.id,
        username: user.username,
        startIndex: queryStart,
        endIndex: queryStart + mentionText.length,
      };

      setValue(newValue);
      setMentions([...adjusted, newMention]);
      resetDropdown();

      // Restore focus
      setTimeout(() => {
        const pos = queryStart + mentionText.length + 1;
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(pos, pos);
      }, 0);
    },
    [value, queryStart, mentions, resetDropdown]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursorPos = e.target.selectionStart;
    setValue(newVal);

    // Check if we're in an @mention context
    const textBeforeCursor = newVal.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex >= 0) {
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      const hasSpace = textAfterAt.includes("\n");

      if ((charBefore === " " || charBefore === "\n" || atIndex === 0) && !hasSpace) {
        setShowDropdown(true);
        setQuery(textAfterAt);
        setQueryStart(atIndex);
        setSelectedIndex(0);
        return;
      }
    }

    resetDropdown();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        resetDropdown();
        return;
      }
    }

    // Normal Enter to send (without shift)
    if (e.key === "Enter" && !e.shiftKey && !showDropdown) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed && files.length === 0) return;
    onSend(
      trimmed,
      mentions.map((m) => ({
        id: m.id,
        username: m.username,
        startIndex: m.startIndex,
        endIndex: m.endIndex,
      })),
      files
    );
    setValue("");
    setMentions([]);
    setFiles([]);
    resetDropdown();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Scroll selected item into view
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const items = dropdownRef.current.children;
      if (items[selectedIndex]) {
        (items[selectedIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, showDropdown]);

  return (
    <div className="shrink-0 px-3 py-2.5 border-t border-border bg-surface-raised">
      <div className="relative">
        {/* Mention dropdown */}
        {showDropdown && filtered.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 right-0 mb-1 max-h-40 overflow-y-auto bg-surface-raised border border-border rounded-lg shadow-lg z-20"
          >
            {filtered.map((user, i) => (
              <button
                key={user.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  insertMention(user);
                }}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${
                  i === selectedIndex
                    ? "bg-primary/20"
                    : "hover:bg-surface-overlay"
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{ backgroundColor: user.color || "#7b68ee" }}
                >
                  {user.initials}
                </div>
                <span className="text-xs text-text truncate">
                  {user.username || user.email || "Unknown"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Attached files preview */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-1 rounded bg-surface border border-border text-[10px] text-text-muted max-w-[180px]"
              >
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="ml-0.5 p-0.5 rounded hover:bg-surface-overlay shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... (@ to mention)"
            rows={1}
            className="flex-1 px-3 py-2.5 rounded-lg bg-surface border border-border text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary text-sm resize-none max-h-24 overflow-y-auto"
            style={{ minHeight: "44px" }}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2.5 rounded-lg hover:bg-surface-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 text-text-muted" />
          </button>
          <button
            onClick={handleSend}
            disabled={(!value.trim() && files.length === 0) || disabled}
            className="p-2.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
