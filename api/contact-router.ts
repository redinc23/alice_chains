import { z } from "zod";
import { eq, and, or, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { contacts, users } from "@db/schema";

export const contactRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const rows = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        contactUserId: contacts.contactUserId,
        status: contacts.status,
        nickname: contacts.nickname,
        createdAt: contacts.createdAt,
        contactName: users.name,
        contactAvatar: users.avatar,
        contactEmail: users.email,
      })
      .from(contacts)
      .leftJoin(users, eq(contacts.contactUserId, users.id))
      .where(
        and(
          eq(contacts.userId, userId),
          eq(contacts.status, "accepted")
        )
      );

    return rows;
  }),

  pending: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const rows = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        contactUserId: contacts.contactUserId,
        status: contacts.status,
        nickname: contacts.nickname,
        createdAt: contacts.createdAt,
        contactName: users.name,
        contactAvatar: users.avatar,
      })
      .from(contacts)
      .leftJoin(users, eq(contacts.userId, users.id))
      .where(
        and(
          eq(contacts.contactUserId, userId),
          eq(contacts.status, "pending")
        )
      );

    return rows;
  }),

  add: authedQuery
    .input(z.object({ contactUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      if (userId === input.contactUserId) {
        throw new Error("Cannot add yourself as a contact");
      }

      // Check if contact request already exists
      const [existing] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, userId),
            eq(contacts.contactUserId, input.contactUserId)
          )
        )
        .limit(1);

      if (existing) {
        throw new Error("Contact request already exists");
      }

      await db.insert(contacts).values({
        userId,
        contactUserId: input.contactUserId,
        status: "pending",
      });

      // Also create the reverse entry
      await db
        .insert(contacts)
        .values({
          userId: input.contactUserId,
          contactUserId: userId,
          status: "pending",
        })
        .onDuplicateKeyUpdate({
          set: { status: "pending" },
        });

      return { success: true };
    }),

  accept: authedQuery
    .input(z.object({ contactId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Update the pending request where current user is the receiver
      await db
        .update(contacts)
        .set({ status: "accepted" })
        .where(
          and(
            eq(contacts.contactUserId, userId),
            eq(contacts.userId, input.contactId)
          )
        );

      // Update the reverse entry too
      await db
        .update(contacts)
        .set({ status: "accepted" })
        .where(
          and(
            eq(contacts.userId, userId),
            eq(contacts.contactUserId, input.contactId)
          )
        );

      return { success: true };
    }),

  remove: authedQuery
    .input(z.object({ contactUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      await db
        .delete(contacts)
        .where(
          or(
            and(
              eq(contacts.userId, userId),
              eq(contacts.contactUserId, input.contactUserId)
            ),
            and(
              eq(contacts.userId, input.contactUserId),
              eq(contacts.contactUserId, userId)
            )
          )
        );

      return { success: true };
    }),

  searchUsers: authedQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        })
        .from(users)
        .where(
          or(
            sql`${users.name} LIKE ${"%" + input.query + "%"}`,
            sql`${users.email} LIKE ${"%" + input.query + "%"}`
          )
        )
        .limit(20);

      return rows.filter((u) => u.id !== userId);
    }),
});
