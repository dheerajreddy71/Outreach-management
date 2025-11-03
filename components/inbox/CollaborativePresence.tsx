"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/lib/socket-provider";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresenceUser {
  userId: string;
  userName: string;
  userEmail: string;
  action: "viewing" | "editing";
}

interface CollaborativePresenceProps {
  contactId: string;
  currentUserId: string;
  currentUserName: string;
  className?: string;
}

/**
 * Shows real-time presence of team members viewing/editing a contact
 * Uses WebSocket for instant updates across clients
 */
export function CollaborativePresence({
  contactId,
  currentUserId,
  currentUserName,
  className,
}: CollaborativePresenceProps) {
  const { socket, isConnected } = useSocket();
  const [presentUsers, setPresentUsers] = useState<Map<string, PresenceUser>>(
    new Map()
  );

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join contact room
    socket.emit("join:contact", contactId);

    // Announce presence
    socket.emit("presence:viewing", {
      contactId,
      userId: currentUserId,
      userName: currentUserName,
    });

    // Listen for other users joining
    socket.on("user:viewing", (data: any) => {
      setPresentUsers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          userId: data.userId,
          userName: data.userName || "Unknown",
          userEmail: data.userEmail || "",
          action: "viewing",
        });
        return next;
      });
    });

    // Listen for users editing
    socket.on("user:editing", (data: any) => {
      setPresentUsers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          userId: data.userId,
          userName: data.userName || "Unknown",
          userEmail: data.userEmail || "",
          action: "editing",
        });
        return next;
      });
    });

    // Listen for users leaving
    socket.on("user:left", (data: any) => {
      setPresentUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Cleanup
    return () => {
      socket.emit("presence:leave", { contactId, userId: currentUserId });
      socket.emit("leave:contact", contactId);
      socket.off("user:viewing");
      socket.off("user:editing");
      socket.off("user:left");
    };
  }, [socket, isConnected, contactId, currentUserId, currentUserName]);

  // Broadcast editing state
  const setEditing = (isEditing: boolean) => {
    if (!socket || !isConnected) return;

    if (isEditing) {
      socket.emit("presence:editing", {
        contactId,
        userId: currentUserId,
        userName: currentUserName,
      });
    } else {
      socket.emit("presence:viewing", {
        contactId,
        userId: currentUserId,
        userName: currentUserName,
      });
    }
  };

  const otherUsers = Array.from(presentUsers.values()).filter(
    (user) => user.userId !== currentUserId
  );

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <div className="flex items-center gap-1">
        {otherUsers.map((user) => (
          <div
            key={user.userId}
            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full"
            title={`${user.userName} is ${user.action}`}
          >
            {user.action === "editing" ? (
              <Pencil className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
            <span className="text-xs font-medium">{user.userName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook to broadcast editing state
 */
export function usePresenceEditing(
  contactId: string,
  currentUserId: string,
  currentUserName: string
) {
  const { socket, isConnected } = useSocket();

  const setEditing = (isEditing: boolean) => {
    if (!socket || !isConnected) return;

    if (isEditing) {
      socket.emit("presence:editing", {
        contactId,
        userId: currentUserId,
        userName: currentUserName,
      });
    } else {
      socket.emit("presence:viewing", {
        contactId,
        userId: currentUserId,
        userName: currentUserName,
      });
    }
  };

  return { setEditing };
}
