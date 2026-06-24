import { authRouter } from "./auth-router";
import { conversationRouter } from "./conversation-router";
import { messageRouter } from "./message-router";
import { contactRouter } from "./contact-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  conversation: conversationRouter,
  message: messageRouter,
  contact: contactRouter,
});

export type AppRouter = typeof appRouter;
