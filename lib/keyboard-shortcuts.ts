import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  callback: () => void;
  description: string;
}

/**
 * Hook to register keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      const isTyping = 
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null;

      // If user is typing, only allow shortcuts with Ctrl/Cmd key
      if (isTyping) {
        // Allow Ctrl+shortcuts (like Ctrl+Enter) but not plain letter shortcuts
        const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
        if (!hasModifier) {
          return; // Don't process shortcuts while typing
        }
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(" + ");
}

/**
 * Common inbox keyboard shortcuts
 */
export const INBOX_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: "n",
    ctrl: true,
    description: "New message",
    callback: () => {}, // Override in component
  },
  {
    key: "r",
    ctrl: true,
    description: "Reply to current message",
    callback: () => {},
  },
  {
    key: "e",
    ctrl: true,
    description: "Archive conversation",
    callback: () => {},
  },
  {
    key: "s",
    ctrl: true,
    shift: true,
    description: "Star/unstar conversation",
    callback: () => {},
  },
  {
    key: "k",
    description: "Navigate up",
    callback: () => {},
  },
  {
    key: "j",
    description: "Navigate down",
    callback: () => {},
  },
  {
    key: "Enter",
    description: "Open conversation",
    callback: () => {},
  },
  {
    key: "Escape",
    description: "Close conversation",
    callback: () => {},
  },
  {
    key: "/",
    description: "Focus search",
    callback: () => {},
  },
];
