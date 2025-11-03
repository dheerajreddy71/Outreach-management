import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

let io: SocketIOServer | null = null;

export const initSocketServer = (server: NetServer) => {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Join user-specific room for notifications
    socket.on("join:user", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user:${userId}`);
    });

    // Join contact-specific rooms
    socket.on("join:contact", (contactId: string) => {
      socket.join(`contact:${contactId}`);
      console.log(`Socket ${socket.id} joined contact:${contactId}`);
    });

    socket.on("leave:contact", (contactId: string) => {
      socket.leave(`contact:${contactId}`);
      console.log(`Socket ${socket.id} left contact:${contactId}`);
    });

    // Typing indicators
    socket.on("typing:start", (data: { contactId: string; userId: string }) => {
      socket.to(`contact:${data.contactId}`).emit("user:typing", {
        userId: data.userId,
        contactId: data.contactId,
      });
    });

    socket.on("typing:stop", (data: { contactId: string; userId: string }) => {
      socket.to(`contact:${data.contactId}`).emit("user:stopped-typing", {
        userId: data.userId,
        contactId: data.contactId,
      });
    });

    // Presence
    socket.on("presence:viewing", (data: { contactId: string; userId: string; userName?: string; userEmail?: string }) => {
      socket.to(`contact:${data.contactId}`).emit("user:viewing", {
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        contactId: data.contactId,
      });
    });

    socket.on("presence:editing", (data: { contactId: string; userId: string; userName?: string; userEmail?: string }) => {
      socket.to(`contact:${data.contactId}`).emit("user:editing", {
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        contactId: data.contactId,
      });
    });

    socket.on("presence:leave", (data: { contactId: string; userId: string }) => {
      socket.to(`contact:${data.contactId}`).emit("user:left", {
        userId: data.userId,
        contactId: data.contactId,
      });
    });

    // Note collaboration
    socket.on("note:created", (data: { contactId: string; note: any }) => {
      socket.to(`contact:${data.contactId}`).emit("note:new", data.note);
    });

    socket.on("note:updated", (data: { contactId: string; note: any }) => {
      socket.to(`contact:${data.contactId}`).emit("note:updated", data.note);
    });

    socket.on("note:deleted", (data: { contactId: string; noteId: string }) => {
      socket.to(`contact:${data.contactId}`).emit("note:deleted", { noteId: data.noteId });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

export const getSocketServer = () => io;

// Emit events
export const emitNewMessage = (contactId: string, message: any) => {
  if (io) {
    io.to(`contact:${contactId}`).emit("message:new", message);
    io.emit("message:global", message); // For inbox list updates
  }
};

export const emitMessageUpdate = (contactId: string, message: any) => {
  if (io) {
    io.to(`contact:${contactId}`).emit("message:updated", message);
  }
};

export const emitContactUpdate = (contactId: string, contact: any) => {
  if (io) {
    io.emit("contact:updated", contact);
  }
};
