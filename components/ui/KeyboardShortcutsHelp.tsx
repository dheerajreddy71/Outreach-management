"use client";

import { useState, useEffect } from "react";
import { X, Command, Keyboard } from "lucide-react";
import { Card, CardHeader, CardContent } from "./Card";

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { keys: ["Ctrl", "N"], description: "New message", category: "Navigation" },
  { keys: ["/"], description: "Focus search", category: "Navigation" },
  { keys: ["J"], description: "Navigate down", category: "Navigation" },
  { keys: ["K"], description: "Navigate up", category: "Navigation" },
  { keys: ["Enter"], description: "Open conversation", category: "Navigation" },
  { keys: ["Esc"], description: "Close conversation", category: "Navigation" },
  
  // General
  { keys: ["?"], description: "Show keyboard shortcuts", category: "General" },
  { keys: ["Ctrl", "S"], description: "Save/Send", category: "General" },
  { keys: ["Ctrl", "K"], description: "Quick command", category: "General" },
  { keys: ["Ctrl", "F"], description: "Find in page", category: "General" },
  
  // Inbox
  { keys: ["G", "I"], description: "Go to inbox", category: "Inbox" },
  { keys: ["C"], description: "Compose new message", category: "Inbox" },
  { keys: ["R"], description: "Reply to message", category: "Inbox" },
  { keys: ["A"], description: "Archive conversation", category: "Inbox" },
  
  // Contacts
  { keys: ["G", "C"], description: "Go to contacts", category: "Contacts" },
  { keys: ["N"], description: "New contact", category: "Contacts" },
  { keys: ["E"], description: "Edit contact", category: "Contacts" },
  { keys: ["D"], description: "Delete contact", category: "Contacts" },
  
  // Analytics
  { keys: ["G", "A"], description: "Go to analytics", category: "Analytics" },
  { keys: ["1"], description: "Overview tab", category: "Analytics" },
  { keys: ["2"], description: "Funnel tab", category: "Analytics" },
  { keys: ["3"], description: "Team tab", category: "Analytics" },
];

const categories = ["General", "Navigation", "Inbox", "Contacts", "Analytics"];

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show help modal on "?" key
      if (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        
        e.preventDefault();
        setIsOpen(true);
      }
      
      // Close modal on Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => {
              const categoryShortcuts = shortcuts.filter((s) => s.category === category);
              if (categoryShortcuts.length === 0) return null;
              
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{category}</h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-700">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <div key={keyIdx} className="flex items-center gap-1">
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded shadow-sm">
                                {key === "Ctrl" ? (
                                  <span className="flex items-center gap-1">
                                    <Command className="w-3 h-3" />
                                    {key}
                                  </span>
                                ) : (
                                  key
                                )}
                              </kbd>
                              {keyIdx < shortcut.keys.length - 1 && (
                                <span className="text-gray-400 text-xs">+</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600">
              Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">?</kbd> anytime to show this help
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
