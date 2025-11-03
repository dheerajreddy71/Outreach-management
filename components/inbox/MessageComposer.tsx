"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Send, Paperclip, FileText, Smile } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Input";
import { SmartComposer } from "../ui/SmartComposer";
import { useTypingIndicator } from "./PresenceIndicator";
import { useSocket } from "@/lib/socket-provider";
import type { ContactWithRelations, MessageChannel } from "@/types";

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

interface MessageComposerProps {
  contact: ContactWithRelations;
  onClose: () => void;
}

export function MessageComposer({ contact, onClose }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("SMS");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Get user ID from session
  const [currentUserId, setCurrentUserId] = useState<string>("");
  useEffect(() => {
    fetch("/api/user").then(res => res.json()).then(data => setCurrentUserId(data.user?.id || ""));
  }, []);

  // Typing indicator
  const { startTyping, stopTyping } = useTypingIndicator(contact.id, currentUserId);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (e.target.value) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Fetch templates for the current channel
  const { data: templatesData } = useQuery({
    queryKey: ["templates", channel],
    queryFn: async () => {
      const res = await fetch(`/api/templates?channel=${channel}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { contactId: string; channel: MessageChannel; content: string; attachments?: string[] }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", contact.id] });
      setContent("");
      setAttachments([]);
      onClose();
    },
  });

  const handleSend = async () => {
    if (!content.trim() && uploadedUrls.length === 0) return;
    
    sendMutation.mutate({
      contactId: contact.id,
      channel,
      content: content.trim(),
      attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validFiles = files.filter(f => 
      f.type.startsWith("image/") || 
      f.type.startsWith("video/") ||
      f.type === "application/pdf"
    );

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const uploadPromises = validFiles.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    });

    try {
      const urls = await Promise.all(uploadPromises);
      setUploadedUrls(prev => [...prev, ...urls]);
      setAttachments(prev => [...prev, ...validFiles]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const availableChannels: MessageChannel[] = [];
  if (contact.phone) availableChannels.push("SMS");
  if (contact.whatsapp || contact.phone) availableChannels.push("WHATSAPP");
  if (contact.email) availableChannels.push("EMAIL");

  const templates = templatesData?.templates || [];

  // Apply template with variable substitution
  const applyTemplate = (templateContent: string) => {
    let result = templateContent;
    
    // Replace variables with contact data
    result = result.replace(/\{\{firstName\}\}/g, contact.firstName || "");
    result = result.replace(/\{\{lastName\}\}/g, contact.lastName || "");
    result = result.replace(/\{\{company\}\}/g, contact.company || "");
    result = result.replace(/\{\{email\}\}/g, contact.email || "");
    result = result.replace(/\{\{phone\}\}/g, contact.phone || "");
    
    setContent(result);
    setShowTemplates(false);
  };

  const handleEmojiSelect = (emoji: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + emoji.native + content.slice(end);
    
    setContent(newContent);
    setShowEmojiPicker(false);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.native.length, start + emoji.native.length);
    }, 0);
  };

  return (
    <div className="bg-white border-t border-gray-200">
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="text-xs sm:text-sm font-medium flex-shrink-0">Send via:</span>
          <div className="flex gap-1 sm:gap-2 overflow-x-auto">
            {availableChannels.map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg transition-colors whitespace-nowrap ${
                  channel === ch
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {sendMutation.error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
            {sendMutation.error.message}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          placeholder="Type your message..."
          value={content}
          onChange={handleContentChange}
          rows={4}
          className="mb-4 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              stopTyping();
              handleSend();
            }
          }}
        />

        {/* File attachments preview */}
        {attachments.length > 0 && (
          <div className="mb-4 flex gap-2 flex-wrap">
            {attachments.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <div className="text-xs text-gray-500 mt-1 truncate w-16 sm:w-20">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex gap-1 sm:gap-2 relative flex-wrap">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs sm:text-sm"
            >
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
            <SmartComposer
              onSelectSuggestion={(text) => {
                setContent(content + (content ? "\n\n" : "") + text);
                textareaRef.current?.focus();
              }}
              contactName={`${contact.firstName || ""} ${contact.lastName || ""}`.trim()}
              context={channel}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-xs sm:text-sm"
            >
              <Smile className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Emoji</span>
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-50">
                <Picker
                  data={async () => {
                    const response = await fetch(
                      "https://cdn.jsdelivr.net/npm/@emoji-mart/data"
                    );
                    return response.json();
                  }}
                  onEmojiSelect={handleEmojiSelect}
                  theme="light"
                />
              </div>
            )}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Paperclip className="w-4 h-4" />
                <span className="hidden sm:inline">Attach ({attachments.length})</span>
                <span className="sm:hidden">({attachments.length})</span>
              </span>
            </label>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" onClick={onClose} size="sm" className="text-xs sm:text-sm">
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={(!content.trim() && attachments.length === 0) || sendMutation.isPending}
              size="sm"
              className="text-xs sm:text-sm"
            >
              {sendMutation.isPending ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <Send className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 hidden sm:block">
          Press Ctrl+Enter to send
        </p>

        {/* Templates dropdown */}
        {showTemplates && templates.length > 0 && (
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Select a template for {channel}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {templates.map((template: any) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.content)}
                  className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-xs sm:text-sm text-gray-900 mb-1">
                    {template.name}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {template.content}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {showTemplates && templates.length === 0 && (
          <div className="mt-4 p-3 sm:p-4 border border-gray-200 rounded-lg text-center text-xs sm:text-sm text-gray-500">
            No templates for {channel}. <a href="/templates" className="text-blue-600 hover:underline">Create one</a>
          </div>
        )}
      </div>
    </div>
  );
}
