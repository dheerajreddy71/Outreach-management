"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Building, Tag, Clock, MessageSquare, StickyNote, Lock, Globe, Users, Reply, Trash2 } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { MentionTextarea } from "../ui/MentionTextarea";
import { CollaborativePresence } from "./CollaborativePresence";
import { useSocket } from "@/lib/socket-provider";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import type { ContactWithRelations } from "@/types";

interface ContactProfileProps {
  contact: ContactWithRelations;
  initialTab?: "info" | "notes" | "activity";
  highlightedNoteId?: string | null;
}

type NoteVisibility = "PUBLIC" | "PRIVATE" | "TEAM";

export function ContactProfile({ contact, initialTab = "info", highlightedNoteId = null }: ContactProfileProps) {
  const [activeTab, setActiveTab] = useState<"info" | "notes" | "activity">(initialTab);
  const [newNote, setNewNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<NoteVisibility>("PUBLIC");
  const [replyToNote, setReplyToNote] = useState<string | null>(null);
  const highlightedNoteRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Fetch current user
  const { data: userData } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const currentUser = userData?.user;

  // Fetch notes
  const { data: notesData } = useQuery({
    queryKey: ["notes", contact.id],
    queryFn: async () => {
      const res = await fetch(`/api/notes?contactId=${contact.id}`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
  });

  const notes = notesData?.notes || [];

  // Real-time note updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNote = () => {
      queryClient.invalidateQueries({ queryKey: ["notes", contact.id] });
    };

    const handleNoteUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["notes", contact.id] });
    };

    const handleNoteDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ["notes", contact.id] });
    };

    socket.on("note:new", handleNewNote);
    socket.on("note:updated", handleNoteUpdated);
    socket.on("note:deleted", handleNoteDeleted);

    return () => {
      socket.off("note:new", handleNewNote);
      socket.off("note:updated", handleNoteUpdated);
      socket.off("note:deleted", handleNoteDeleted);
    };
  }, [socket, isConnected, contact.id, queryClient]);

  // Handle initial tab and highlighted note from URL params
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Scroll to highlighted note when notes are loaded
  useEffect(() => {
    if (highlightedNoteId && activeTab === "notes" && notes.length > 0) {
      // Wait for DOM to update
      setTimeout(() => {
        highlightedNoteRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        });
      }, 100);
    }
  }, [highlightedNoteId, activeTab, notes]);

  // Fetch messages for activity tab
  const { data: activityData } = useQuery({
    queryKey: ["messages", contact.id],
    queryFn: async () => {
      const res = await fetch(`/api/messages?contactId=${contact.id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: activeTab === "activity",
  });

  const messages = activityData?.messages || [];

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          content: newNote.trim(),
          visibility: noteVisibility,
          parentId: replyToNote,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewNote("");
        setReplyToNote(null);
        
        // Broadcast note creation via WebSocket
        if (socket && isConnected) {
          socket.emit("note:created", {
            contactId: contact.id,
            note: data.note,
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ["notes", contact.id] });
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const res = await fetch(`/api/notes?id=${noteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (socket && isConnected) {
          socket.emit("note:deleted", {
            contactId: contact.id,
            noteId,
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ["notes", contact.id] });
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const renderNote = (note: any, level = 0) => {
    const isOwnNote = currentUser?.id === note.userId;
    const canDelete = isOwnNote || currentUser?.role === "ADMIN";
    const isHighlighted = highlightedNoteId === note.id;

    return (
      <div 
        key={note.id} 
        className={`${level > 0 ? "ml-8 mt-2" : ""}`}
        ref={isHighlighted ? highlightedNoteRef : undefined}
      >
        <div className={`
          rounded-lg p-3 sm:p-4 transition-all duration-300
          ${isHighlighted 
            ? "bg-yellow-100 border-2 border-yellow-400 ring-2 ring-yellow-200" 
            : "bg-gray-50"
          }
        `}>
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {getInitials(note.user?.name || "U")}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-900 block truncate">
                  {note.user?.name || "Unknown"}
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(new Date(note.createdAt))}
                  </span>
                  {note.visibility === "PRIVATE" && (
                    <span title="Private">
                      <Lock className="w-3 h-3 text-gray-400" />
                    </span>
                  )}
                  {note.visibility === "TEAM" && (
                    <span title="Team only">
                      <Users className="w-3 h-3 text-gray-400" />
                    </span>
                  )}
                  {note.visibility === "PUBLIC" && (
                    <span title="Public">
                      <Globe className="w-3 h-3 text-gray-400" />
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setReplyToNote(note.id)}
                className="p-1 hover:bg-gray-200 rounded"
                title="Reply"
              >
                <Reply className="w-3 h-3 text-gray-600" />
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 hover:bg-red-100 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap break-words">
            {note.content}
          </p>
          {note.mentions && note.mentions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {note.mentions.map((mention: string) => (
                <Badge key={mention} variant="default" className="text-xs">
                  @{mention.split("@")[0]}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* Nested Replies */}
        {note.replies && note.replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {note.replies.map((reply: any) => renderNote(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Filter out replies from top-level notes
  const topLevelNotes = notes.filter((note: any) => !note.parentId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-semibold flex-shrink-0">
            {getInitials(
              `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "U"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {contact.firstName || contact.lastName
                ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                : "Unknown Contact"}
            </h2>
            {contact.jobTitle && (
              <p className="text-xs sm:text-sm text-gray-600 truncate">{contact.jobTitle}</p>
            )}
          </div>
        </div>
        
        {/* Presence Indicator */}
        {currentUser && (
          <div className="mt-3">
            <CollaborativePresence
              contactId={contact.id}
              currentUserId={currentUser.id}
              currentUserName={currentUser.name || currentUser.email}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
            activeTab === "info"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Info
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
            activeTab === "notes"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Notes ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
            activeTab === "activity"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Activity
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === "info" && (
          <div className="space-y-4 sm:space-y-6">
            {contact.email && (
              <div className="flex items-start gap-2 sm:gap-3">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase mb-1">Email</p>
                  <p className="text-xs sm:text-sm text-gray-900 break-all">{contact.email}</p>
                </div>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-start gap-2 sm:gap-3">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase mb-1">Phone</p>
                  <p className="text-xs sm:text-sm text-gray-900">{contact.phone}</p>
                </div>
              </div>
            )}

            {contact.whatsapp && (
              <div className="flex items-start gap-2 sm:gap-3">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase mb-1">WhatsApp</p>
                  <p className="text-xs sm:text-sm text-gray-900">{contact.whatsapp}</p>
                </div>
              </div>
            )}

            {contact.company && (
              <div className="flex items-start gap-2 sm:gap-3">
                <Building className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase mb-1">Company</p>
                  <p className="text-xs sm:text-sm text-gray-900">{contact.company}</p>
                </div>
              </div>
            )}

            {contact.tags && contact.tags.length > 0 && (
              <div className="flex items-start gap-2 sm:gap-3">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="default" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {contact.lastContactedAt && (
              <div className="flex items-start gap-2 sm:gap-3">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase mb-1">Last Contacted</p>
                  <p className="text-xs sm:text-sm text-gray-900">
                    {formatRelativeTime(new Date(contact.lastContactedAt))}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
            {/* Note Composer */}
            <div className="sticky top-0 bg-white pb-4 border-b">
              {replyToNote && (
                <div className="mb-2 p-2 bg-blue-50 rounded flex items-center justify-between">
                  <span className="text-xs text-blue-700">
                    <Reply className="w-3 h-3 inline mr-1" />
                    Replying to note
                  </span>
                  <button
                    onClick={() => setReplyToNote(null)}
                    className="text-xs text-blue-700 hover:text-blue-900"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              <MentionTextarea
                value={newNote}
                onChange={setNewNote}
                onSubmit={handleAddNote}
                placeholder="Add a note... Type @ to mention team members"
                rows={3}
              />

              {/* Visibility Toggle */}
              <div className="flex items-center gap-2 mt-2 mb-2">
                <span className="text-xs text-gray-600">Visibility:</span>
                <button
                  onClick={() => setNoteVisibility("PUBLIC")}
                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                    noteVisibility === "PUBLIC"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  Public
                </button>
                <button
                  onClick={() => setNoteVisibility("TEAM")}
                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                    noteVisibility === "TEAM"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  Team
                </button>
                <button
                  onClick={() => setNoteVisibility("PRIVATE")}
                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                    noteVisibility === "PRIVATE"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  Private
                </button>
              </div>

              <Button onClick={handleAddNote} size="sm" disabled={!newNote.trim()}>
                <StickyNote className="w-4 h-4 mr-2" />
                {replyToNote ? "Post Reply" : "Add Note"}
              </Button>
            </div>

            {/* Notes List */}
            <div className="space-y-3">
              {topLevelNotes.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-8">No notes yet</p>
              ) : (
                topLevelNotes.map((note: any) => renderNote(note))
              )}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-4">
            {/* Activity Filter */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default" className="cursor-pointer text-xs">All</Badge>
              <Badge variant="default" className="cursor-pointer text-xs">Messages</Badge>
              <Badge variant="default" className="cursor-pointer text-xs">Notes</Badge>
            </div>

            {/* Unified Activity Timeline */}
            <div className="space-y-3">
              {(() => {
                const activities: any[] = [];

                // Add messages
                messages.forEach((msg: any) => {
                  activities.push({
                    id: `msg-${msg.id}`,
                    type: "message",
                    timestamp: new Date(msg.createdAt),
                    data: msg,
                  });
                });

                // Add notes
                notes.forEach((note: any) => {
                  activities.push({
                    id: `note-${note.id}`,
                    type: "note",
                    timestamp: new Date(note.createdAt),
                    data: note,
                  });
                });

                // Sort by timestamp descending
                activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                if (activities.length === 0) {
                  return (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-8">
                      No activity yet
                    </p>
                  );
                }

                return activities.map((activity) => {
                  if (activity.type === "message") {
                    const msg = activity.data;
                    return (
                      <div
                        key={activity.id}
                        className="border-l-2 border-blue-600 pl-3 sm:pl-4 py-2"
                      >
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            {msg.channel}
                          </Badge>
                          <Badge
                            variant={msg.direction === "INBOUND" ? "success" : "default"}
                            className="text-xs"
                          >
                            {msg.direction}
                          </Badge>
                          {msg.direction === "OUTBOUND" && msg.user && (
                            <span className="text-xs font-medium text-gray-700">
                              by {msg.user.name || msg.user.email}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 break-words">
                          {msg.content.length > 200
                            ? msg.content.substring(0, 200) + "..."
                            : msg.content}
                        </p>
                        {msg.status && (
                          <span className="text-xs text-gray-500 mt-1 block">
                            Status: {msg.status}
                          </span>
                        )}
                      </div>
                    );
                  } else if (activity.type === "note") {
                    const note = activity.data;
                    return (
                      <div
                        key={activity.id}
                        className="border-l-2 border-green-600 pl-3 sm:pl-4 py-2"
                      >
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                          <StickyNote className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-medium text-gray-900">
                            {note.user?.name || "Unknown"}
                          </span>
                          <span className="text-xs text-gray-500">added a note</span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                          {note.visibility === "PRIVATE" && (
                            <Badge variant="warning" className="text-xs">
                              <Lock className="w-2 h-2 mr-1 inline" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 break-words">
                          {note.content.length > 200
                            ? note.content.substring(0, 200) + "..."
                            : note.content}
                        </p>
                        {note.mentions && note.mentions.length > 0 && (
                          <div className="mt-1">
                            <Badge variant="default" className="text-xs">
                              💬 {note.mentions.length} mention(s)
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                });
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
