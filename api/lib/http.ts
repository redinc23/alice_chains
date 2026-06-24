import { z } from "zod";

export function validateBody<T extends z.ZodType>(
  body: unknown,
  schema: T
): z.infer<T> {
  return schema.parse(body);
}

export function createSuccessResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createErrorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
