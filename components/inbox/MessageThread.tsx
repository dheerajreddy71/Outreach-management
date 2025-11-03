"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, useMemo } from "react";
import { Phone, Video, MoreVertical, Send, ArrowLeft, User } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { VoIPDialer } from "./VoIPDialer";
import { VideoCallDialog } from "./VideoCallDialog";
import { getChannelColor, formatRelativeTime } from "@/lib/utils";
import { useSocket } from "@/lib/socket-provider";
import type { ContactWithRelations, MessageWithRelations } from "@/types";

interface MessageThreadProps {
  contact: ContactWithRelations;
  onCompose: () => void;
  onBack?: () => void;
  onShowProfile?: () => void;
  canSendMessages?: boolean;
}

export function MessageThread({ contact, onCompose, onBack, onShowProfile, canSendMessages = true }: MessageThreadProps) {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showVoIPDialer, setShowVoIPDialer] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["messages", contact.id],
    queryFn: async () => {
      const res = await fetch(`/api/messages?contactId=${contact.id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: isConnected ? false : 5000, // Only poll if not connected to socket
  });

  const messages: MessageWithRelations[] = useMemo(() => messagesData?.messages || [], [messagesData?.messages]);

  // Make call mutation
  const makeCallMutation = useMutation({
    mutationFn: async (callData: { contactId: string; to: string; from: string }) => {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to make call");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", contact.id] });
      alert(data.message || "Call initiated successfully!");
    },
    onError: (error: Error) => {
      alert(`Failed to make call: ${error.message}`);
    },
  });

  const handleMakeCall = () => {
    if (!contact.phone && !contact.whatsapp) {
      alert("No phone number available for this contact");
      return;
    }

    // Open VoIP dialer instead of prompt
    setShowVoIPDialer(true);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time message updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join contact room
    socket.emit("join:contact", contact.id);

    // Listen for new messages
    const handleNewMessage = (message: MessageWithRelations) => {
      if (message.contactId === contact.id) {
        queryClient.invalidateQueries({ queryKey: ["messages", contact.id] });
      }
    };

    const handleMessageUpdate = (message: MessageWithRelations) => {
      if (message.contactId === contact.id) {
        queryClient.invalidateQueries({ queryKey: ["messages", contact.id] });
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleMessageUpdate);

    return () => {
      socket.emit("leave:contact", contact.id);
      socket.off("message:new", handleNewMessage);
      socket.off("message:updated", handleMessageUpdate);
    };
  }, [socket, isConnected, contact.id, queryClient]);

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Mobile back button */}
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="lg:hidden flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {contact.firstName || contact.lastName
                  ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                  : contact.email || contact.phone || "Unknown"}
              </h2>
              {contact.company && (
                <p className="text-xs sm:text-sm text-gray-500 truncate">{contact.company}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Mobile profile button */}
            {onShowProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowProfile}
                className="xl:hidden"
                title="View contact details"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleMakeCall}
              disabled={makeCallMutation.isPending || (!contact.phone && !contact.whatsapp)}
              title={contact.phone || contact.whatsapp ? "Make a call" : "No phone number available"}
              className="hidden sm:flex"
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowVideoCall(true)}
              title="Start video call"
              className="hidden sm:flex"
            >
              <Video className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="relative"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {showMobileMenu && (
          <div className="sm:hidden absolute right-4 top-16 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
            <button
              onClick={() => {
                handleMakeCall();
                setShowMobileMenu(false);
              }}
              disabled={!contact.phone && !contact.whatsapp}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <Phone className="w-4 h-4" />
              Make a call
            </button>
            <button
              onClick={() => {
                setShowVideoCall(true);
                setShowMobileMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Video call
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <p className="text-gray-500 text-sm sm:text-base">No messages yet</p>
            <Button 
              onClick={onCompose} 
              className="mt-4" 
              size="sm"
              disabled={!canSendMessages}
              title={!canSendMessages ? "Only Admins and Editors can send messages" : ""}
            >
              <Send className="w-4 h-4 mr-2" />
              Send first message
            </Button>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.direction === "OUTBOUND" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
                  message.status === "FAILED"
                    ? "bg-red-50 border-2 border-red-200 text-red-900"
                    : message.direction === "OUTBOUND"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                } rounded-lg px-3 sm:px-4 py-2`}
              >
                <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                  <Badge className={`${getChannelColor(message.channel)} text-xs`}>
                    {message.channel}
                  </Badge>
                  {message.status === "FAILED" && (
                    <Badge variant="error" className="text-xs">FAILED</Badge>
                  )}
                  {message.direction === "OUTBOUND" && (message as any).user && (
                    <span
                      className={`text-xs font-medium ${
                        message.status === "FAILED"
                          ? "text-red-700"
                          : "text-blue-100"
                      }`}
                    >
                      by {(message as any).user.name || (message as any).user.email}
                    </span>
                  )}
                  <span
                    className={`text-xs ${
                      message.status === "FAILED"
                        ? "text-red-600"
                        : message.direction === "OUTBOUND"
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {formatRelativeTime(new Date(message.createdAt))}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline block"
                      >
                        Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
                {message.status && message.status !== "FAILED" && (
                  <div className="mt-1">
                    <span
                      className={`text-xs ${
                        message.direction === "OUTBOUND"
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {message.status}
                    </span>
                  </div>
                )}
                {message.status === "FAILED" && message.errorMessage && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                    <strong>Error:</strong> {message.errorMessage}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <Button 
          onClick={onCompose} 
          className="w-full"
          disabled={!canSendMessages}
          title={!canSendMessages ? "Only Admins and Editors can send messages" : ""}
        >
          <Send className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>

      {/* VoIP Dialer Modal */}
      {showVoIPDialer && (
        <VoIPDialer
          contact={contact}
          onClose={() => setShowVoIPDialer(false)}
        />
      )}

      {/* Video Call Dialog */}
      {showVideoCall && (
        <VideoCallDialog
          contact={contact}
          onClose={() => setShowVideoCall(false)}
        />
      )}
    </>
  );
}
