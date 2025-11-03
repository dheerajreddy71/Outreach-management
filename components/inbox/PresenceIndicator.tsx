"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/lib/socket-provider";
import { Eye, MessageCircle } from "lucide-react";

interface PresenceIndicatorProps {
  contactId: string;
  currentUserId: string;
}

interface TypingUser {
  userId: string;
  userName?: string;
}

interface ViewingUser {
  userId: string;
  userName?: string;
}

export function PresenceIndicator({ contactId, currentUserId }: PresenceIndicatorProps) {
  const { socket, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [viewingUsers, setViewingUsers] = useState<ViewingUser[]>([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Announce we're viewing this contact
    socket.emit("presence:viewing", {
      contactId,
      userId: currentUserId,
    });

    // Listen for other users typing
    const handleUserTyping = (data: { userId: string; contactId: string; userName?: string }) => {
      if (data.contactId === contactId && data.userId !== currentUserId) {
        setTypingUsers(prev => {
          const exists = prev.find(u => u.userId === data.userId);
          if (!exists) {
            return [...prev, { userId: data.userId, userName: data.userName }];
          }
          return prev;
        });
      }
    };

    const handleUserStoppedTyping = (data: { userId: string; contactId: string }) => {
      if (data.contactId === contactId) {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    };

    // Listen for other users viewing
    const handleUserViewing = (data: { userId: string; contactId: string; userName?: string }) => {
      if (data.contactId === contactId && data.userId !== currentUserId) {
        setViewingUsers(prev => {
          const exists = prev.find(u => u.userId === data.userId);
          if (!exists) {
            return [...prev, { userId: data.userId, userName: data.userName }];
          }
          return prev;
        });

        // Remove from viewing after 5 seconds of inactivity
        setTimeout(() => {
          setViewingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }, 5000);
      }
    };

    socket.on("user:typing", handleUserTyping);
    socket.on("user:stopped-typing", handleUserStoppedTyping);
    socket.on("user:viewing", handleUserViewing);

    return () => {
      socket.off("user:typing", handleUserTyping);
      socket.off("user:stopped-typing", handleUserStoppedTyping);
      socket.off("user:viewing", handleUserViewing);
    };
  }, [socket, isConnected, contactId, currentUserId]);

  if (!isConnected || (typingUsers.length === 0 && viewingUsers.length === 0)) {
    return null;
  }

  return (
    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
      <div className="flex items-center gap-4 text-sm">
        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-blue-700">
            <MessageCircle className="w-4 h-4 animate-pulse" />
            <span>
              {typingUsers.length === 1 ? (
                <>
                  <strong>{typingUsers[0].userName || "Someone"}</strong> is typing...
                </>
              ) : (
                <>
                  <strong>{typingUsers.length} people</strong> are typing...
                </>
              )}
            </span>
          </div>
        )}

        {/* Viewing Indicators */}
        {viewingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-blue-600">
            <Eye className="w-4 h-4" />
            <span>
              {viewingUsers.length === 1 ? (
                <>
                  <strong>{viewingUsers[0].userName || "Someone"}</strong> is viewing
                </>
              ) : (
                <>
                  <strong>{viewingUsers.length} people</strong> are viewing
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for announcing typing
export function useTypingIndicator(contactId: string, currentUserId: string) {
  const { socket, isConnected } = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useState<NodeJS.Timeout | null>(null)[0];

  const startTyping = useCallback(() => {
    if (!socket || !isConnected || isTyping) return;

    setIsTyping(true);
    socket.emit("typing:start", { contactId, userId: currentUserId });

    // Auto-stop after 3 seconds of no activity
    if (typingTimeoutRef) {
      clearTimeout(typingTimeoutRef);
    }
  }, [socket, isConnected, contactId, currentUserId, isTyping, typingTimeoutRef]);

  const stopTyping = useCallback(() => {
    if (!socket || !isConnected || !isTyping) return;

    setIsTyping(false);
    socket.emit("typing:stop", { contactId, userId: currentUserId });
  }, [socket, isConnected, contactId, currentUserId, isTyping]);

  // Auto-stop typing after delay
  useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => {
        stopTyping();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [isTyping, stopTyping]);

  return { startTyping, stopTyping, isTyping };
}
