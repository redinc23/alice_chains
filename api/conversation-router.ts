import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  conversations,
  conversationParticipants,
  messages,
  users,
} from "@db/schema";

export const conversationRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    // Get all conversation IDs where user is a participant
    const participantRows = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = participantRows.map((r) => r.conversationId);
    if (conversationIds.length === 0) return [];

    // Get conversations with latest message
    const convs = await db
      .select({
        id: conversations.id,
        name: conversations.name,
        type: conversations.type,
        avatar: conversations.avatar,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.updatedAt));

    // Get participants for each conversation
    const participants = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        userId: conversationParticipants.userId,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(conversationParticipants)
      .leftJoin(users, eq(conversationParticipants.userId, users.id))
      .where(inArray(conversationParticipants.conversationId, conversationIds));

    // Get latest message for each conversation
    const latestMessages = await db
      .select({
        conversationId: messages.conversationId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
      })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(desc(messages.createdAt));

    // Build result
    const latestByConv = new Map<number, (typeof latestMessages)[number]>();
    for (const m of latestMessages) {
      if (!latestByConv.has(m.conversationId)) {
        latestByConv.set(m.conversationId, m);
      }
    }

    const partsByConv = new Map<number, typeof participants>();
    for (const p of participants) {
      const arr = partsByConv.get(p.conversationId) || [];
      arr.push(p);
      partsByConv.set(p.conversationId, arr);
    }

    return convs.map((conv) => {
      const parts = partsByConv.get(conv.id) || [];
      const otherParticipant = parts.find((p) => p.userId !== userId);
      const latest = latestByConv.get(conv.id);

      return {
        ...conv,
        displayName:
          conv.type === "direct"
            ? otherParticipant?.userName || "Unknown"
            : conv.name || "Group Chat",
        displayAvatar:
          conv.type === "direct"
            ? otherParticipant?.userAvatar
            : conv.avatar,
        participants: parts,
        latestMessage: latest
          ? {
              content: latest.content,
              createdAt: latest.createdAt,
              senderId: latest.senderId,
            }
          : null,
      };
    });
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Verify user is participant
      const [participant] = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, input.id),
            eq(conversationParticipants.userId, userId)
          )
        )
        .limit(1);

      if (!participant) return null;

      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.id))
        .limit(1);

      if (!conv) return null;

      const parts = await db
        .select({
          userId: conversationParticipants.userId,
          userName: users.name,
          userAvatar: users.avatar,
        })
        .from(conversationParticipants)
        .leftJoin(users, eq(conversationParticipants.userId, users.id))
        .where(eq(conversationParticipants.conversationId, input.id));

      const otherParticipant = parts.find((p) => p.userId !== userId);

      return {
        ...conv,
        displayName:
          conv.type === "direct"
            ? otherParticipant?.userName || "Unknown"
            : conv.name || "Group Chat",
        displayAvatar:
          conv.type === "direct"
            ? otherParticipant?.userAvatar
            : conv.avatar,
        participants: parts,
      };
    }),

  createDirect: authedQuery
    .input(z.object({ otherUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Check if direct conversation already exists
      const existingParticipants = await db
        .select({
          conversationId: conversationParticipants.conversationId,
          userId: conversationParticipants.userId,
        })
        .from(conversationParticipants)
        .where(
          inArray(conversationParticipants.userId, [userId, input.otherUserId])
        );

      const convIds1 = existingParticipants
        .filter((p) => p.userId === userId)
        .map((p) => p.conversationId);
      const convIds2 = existingParticipants
        .filter((p) => p.userId === input.otherUserId)
        .map((p) => p.conversationId);

      const commonConvId = convIds1.find((id) => convIds2.includes(id));
      if (commonConvId) {
        const [conv] = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, commonConvId),
              eq(conversations.type, "direct")
            )
          )
          .limit(1);
        if (conv) return conv;
      }

      // Create new direct conversation
      const [newConv] = await db.insert(conversations).values({
        type: "direct",
        createdBy: userId,
      });

      const convId = Number(newConv.insertId);

      await db.insert(conversationParticipants).values([
        { conversationId: convId, userId },
        { conversationId: convId, userId: input.otherUserId },
      ]);

      return { id: convId, type: "direct" as const, createdBy: userId };
    }),

  createGroup: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(100),
        participantIds: z.array(z.number()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const [newConv] = await db.insert(conversations).values({
        name: input.name,
        type: "group",
        createdBy: userId,
      });

      const convId = Number(newConv.insertId);

      const allParticipantIds = [...new Set([userId, ...input.participantIds])];
      await db.insert(conversationParticipants).values(
        allParticipantIds.map((id) => ({
          conversationId: convId,
          userId: id,
        }))
      );

      return { id: convId, name: input.name, type: "group" as const };
    }),

  markAsRead: authedQuery
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(conversationParticipants)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(conversationParticipants.conversationId, input.conversationId),
            eq(conversationParticipants.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});
