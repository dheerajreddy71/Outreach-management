"use client";

import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";

interface MessageSuggestion {
  id: string;
  text: string;
  category: string;
}

interface SmartComposerProps {
  onSelectSuggestion: (text: string) => void;
  contactName?: string;
  context?: string;
}

export function SmartComposer({ onSelectSuggestion, contactName, context }: SmartComposerProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Smart suggestions based on context
  const suggestions: MessageSuggestion[] = [
    {
      id: "1",
      text: `Hi ${contactName || "there"}! Thanks for reaching out. How can I help you today?`,
      category: "Greeting"
    },
    {
      id: "2",
      text: `Thanks for your message! I'll get back to you within 24 hours with more information.`,
      category: "Follow-up"
    },
    {
      id: "3",
      text: `Hi ${contactName || "there"}! Just checking in to see if you had any questions about our previous conversation.`,
      category: "Check-in"
    },
    {
      id: "4",
      text: `Great to hear from you! Let me know if you'd like to schedule a call to discuss this further.`,
      category: "Meeting"
    },
    {
      id: "5",
      text: `Thanks for your patience! Here's the information you requested...`,
      category: "Information"
    },
    {
      id: "6",
      text: `I appreciate you bringing this to my attention. Let me look into this and get back to you shortly.`,
      category: "Issue"
    },
  ];

  const handleCopy = (suggestion: MessageSuggestion) => {
    navigator.clipboard.writeText(suggestion.text);
    onSelectSuggestion(suggestion.text);
    setCopiedId(suggestion.id);
    setTimeout(() => {
      setCopiedId(null);
      setShowSuggestions(false);
    }, 1000);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSuggestions(!showSuggestions)}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Smart Suggestions
      </Button>

      {showSuggestions && (
        <div className="absolute bottom-full left-0 mb-2 w-96 z-50">
          <Card className="p-4 shadow-xl border-2 border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Message Suggestions
              </h3>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="group p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                  onClick={() => handleCopy(suggestion)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-blue-600 mb-1">
                        {suggestion.category}
                      </div>
                      <p className="text-sm text-gray-700">{suggestion.text}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {copiedId === suggestion.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                💡 Tip: Click any suggestion to use it in your message
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
