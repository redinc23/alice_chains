import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./queries/connection";
import { messages, messageReads, conversationParticipants } from "@db/schema";
import { eq, and } from "drizzle-orm";

let io: SocketIOServer | null = null;

// Track online users
const onlineUsers = new Map<number, string>(); // userId -> socketId

export function getIO() {
  return io;
}

export function getOnlineUsers() {
  return new Map(onlineUsers);
}

export function initSocket(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : "http://localhost:3000",
      credentials: true,
    },
    path: "/socket.io",
  });

  io.on("connection", (socket: Socket) => {
    console.log("Socket connected:", socket.id);

    // User joins with their userId
    socket.on("join", ({ userId }: { userId: number }) => {
      onlineUsers.set(userId, socket.id);
      socket.data.userId = userId;
      socket.join(`user_${userId}`);

      // Broadcast online status to contacts
      socket.broadcast.emit("userOnline", { userId });

      // Send current online users to the new user
      socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // Join a conversation room
    socket.on("joinConversation", ({ conversationId }: { conversationId: number }) => {
      socket.join(`conv_${conversationId}`);
    });

    // Leave a conversation room
    socket.on("leaveConversation", ({ conversationId }: { conversationId: number }) => {
      socket.leave(`conv_${conversationId}`);
    });

    // Send a message
    socket.on(
      "sendMessage",
      async (data: {
        conversationId: number;
        content: string;
        type?: string;
        fileUrl?: string;
        replyToId?: number;
        tempId?: string;
      }) => {
        try {
          const userId = socket.data.userId;
          if (!userId) return;

          const db = getDb();

          // Verify user is participant
          const [participant] = await db
            .select()
            .from(conversationParticipants)
            .where(
              and(
                eq(conversationParticipants.conversationId, data.conversationId),
                eq(conversationParticipants.userId, userId)
              )
            )
            .limit(1);

          if (!participant) return;

          // Insert message
          const [result] = await db.insert(messages).values({
            conversationId: data.conversationId,
            senderId: userId,
            content: data.content,
            type: (data.type as "text" | "image" | "file") || "text",
            fileUrl: data.fileUrl,
            replyToId: data.replyToId,
          });

          const messageId = Number(result.insertId);

          // Fetch the complete message with sender info
          const [message] = await db
            .select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);

          if (message) {
            // Broadcast to all participants in the conversation
            io?.to(`conv_${data.conversationId}`).emit("newMessage", {
              ...message,
              tempId: data.tempId,
            });

            // Also notify all participants directly
            const participants = await db
              .select({ userId: conversationParticipants.userId })
              .from(conversationParticipants)
              .where(
                eq(conversationParticipants.conversationId, data.conversationId)
              );

            for (const p of participants) {
              io?.to(`user_${p.userId}`).emit("conversationUpdated", {
                conversationId: data.conversationId,
                lastMessage: message,
              });
            }
          }
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("messageError", { error: "Failed to send message" });
        }
      }
    );

    // Mark messages as read
    socket.on(
      "markAsRead",
      async (data: { messageIds: number[]; conversationId: number }) => {
        try {
          const userId = socket.data.userId;
          if (!userId || !data.messageIds.length) return;

          const db = getDb();

          for (const messageId of data.messageIds) {
            try {
              await db.insert(messageReads).values({
                messageId,
                userId,
              });
            } catch {
              // Ignore duplicates
            }
          }

          // Notify other participants that messages were read
          socket.to(`conv_${data.conversationId}`).emit("messagesRead", {
            messageIds: data.messageIds,
            userId,
          });
        } catch (error) {
          console.error("Error marking as read:", error);
        }
      }
    );

    // Typing indicator
    socket.on(
      "typing",
      (data: { conversationId: number; isTyping: boolean }) => {
        socket.to(`conv_${data.conversationId}`).emit("userTyping", {
          userId: socket.data.userId,
          conversationId: data.conversationId,
          isTyping: data.isTyping,
        });
      }
    );

    // Disconnect
    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (userId) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("userOffline", { userId });
      }
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}
