"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

interface TeamMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Enhanced textarea with @mention autocomplete
 * Detects @ symbol and shows team member dropdown
 * Inserts @email format for proper mention detection
 */
export function MentionTextarea({
  value,
  onChange,
  onSubmit,
  placeholder = "Type @ to mention someone...",
  rows = 3,
  className,
  disabled = false,
}: MentionTextareaProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch team members
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
  });

  // Get all unique team members from all teams user belongs to
  const teamMembers: TeamMember[] = teamData?.teams
    ? teamData.teams.flatMap((team: any) => team.members || [])
        .filter((member: TeamMember, index: number, self: TeamMember[]) => 
          // Remove duplicates by user ID
          index === self.findIndex((m) => m.user.id === member.user.id)
        )
    : [];

  // Filter members based on query
  const filteredMembers = mentionQuery
    ? teamMembers.filter((member) => {
        const name = member.user.name?.toLowerCase() || "";
        const email = member.user.email.toLowerCase();
        const query = mentionQuery.toLowerCase();
        return name.includes(query) || email.includes(query);
      })
    : teamMembers;

  // Detect @ mentions
  useEffect(() => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(" ") && textAfterAt.length <= 50) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setSelectedIndex(0);

        // Calculate dropdown position
        const textarea = textareaRef.current;
        const { offsetTop, offsetLeft } = textarea;
        setMentionPosition({
          top: offsetTop + 30, // Below cursor
          left: offsetLeft + 10,
        });
        return;
      }
    }

    setShowMentions(false);
    setMentionQuery("");
  }, [value]);

  const insertMention = (member: TeamMember) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    // Replace from @ to cursor with @email
    const newValue =
      value.substring(0, lastAtIndex) +
      `@${member.user.email} ` +
      textAfterCursor;

    onChange(newValue);
    setShowMentions(false);
    setMentionQuery("");

    // Set cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + member.user.email.length + 2;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        if (filteredMembers[selectedIndex]) {
          insertMention(filteredMembers[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowMentions(false);
        break;
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none",
          disabled && "bg-gray-50 cursor-not-allowed",
          className
        )}
      />

      {/* Mention Dropdown */}
      {showMentions && (
        <div
          className="absolute z-50 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`,
          }}
        >
          {isLoading ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              Loading team members...
            </div>
          ) : filteredMembers.length > 0 ? (
            filteredMembers.slice(0, 5).map((member, index) => (
              <button
                key={member.id}
                type="button"
                onClick={() => insertMention(member)}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors",
                  index === selectedIndex && "bg-blue-50"
                )}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {member.user.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {member.user.name || "Unknown"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {member.user.email}
                  </div>
                </div>
                {index === selectedIndex && (
                  <div className="text-blue-600 text-xs">
                    ↵
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              {mentionQuery ? `No matches for "${mentionQuery}"` : "No team members found"}
            </div>
          )}
        </div>
      )}

      <div className="mt-1 text-xs text-gray-500">
        {showMentions ? (
          <span className="text-blue-600">
            ↑↓ to navigate • Enter/Tab to select • Esc to close
          </span>
        ) : (
          <>Type @ to mention a team member{!disabled && " • Cmd/Ctrl+Enter to send"}</>
        )}
      </div>
    </div>
  );
}
