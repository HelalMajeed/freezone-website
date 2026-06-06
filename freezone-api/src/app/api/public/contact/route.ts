import { isDatabaseConfigured } from "@/lib/prisma";
import { clientIpFromRequest, clientUserAgentFromRequest, jsonError } from "@/lib/dashboard-guard";
import { stripHtml } from "@/lib/html-sanitize";
import { createNotification } from "@/lib/notifications";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * POST /api/public/contact — contact form (contract (h)).
 *
 * `name` (1–120), `phone` (5–20) and `message` (5–4000) required;
 * `email`/`subject` optional. Server strips HTML. Persists a broadcast
 * Notification (`type: "contact.message"`, payloadJson = the submitted
 * fields) and writes an audit row (`action: "contact.submit"`).
 * Rate limit 5/min/IP lives in server.ts. Response 201:
 * `{ ok: true, data: { id } }` (`id` = Notification id).
 */
export async function POST(req: Request): Promise<Response> {
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; phone?: unknown; email?: unknown; subject?: unknown; message?: unknown }
    | null;
  if (!body) return jsonError(400, "VALIDATION");

  const name = clean(body.name, 120);
  const phone = clean(body.phone, 20);
  const message = clean(body.message, 4000);
  const email = clean(body.email, 254);
  const subject = clean(body.subject, 200);

  const errors: string[] = [];
  if (name.length < 1) errors.push("name");
  if (phone.length < 5 || phone.length > 20) errors.push("phone");
  if (message.length < 5) errors.push("message");
  if (errors.length) return jsonError(400, "VALIDATION", { fields: errors });

  const excerpt = message.length > 200 ? `${message.slice(0, 200)}…` : message;
  const id = await createNotification({
    type: "contact.message",
    titleEn: subject ? `Contact: ${subject}` : `Contact message from ${name}`,
    titleAr: subject ? `تواصل: ${subject}` : `رسالة تواصل من ${name}`,
    bodyEn: `${name} (${phone}) — ${excerpt}`,
    bodyAr: `${name} (${phone}) — ${excerpt}`,
    entity: "Contact",
    payloadJson: {
      name,
      phone,
      email: email || null,
      subject: subject || null,
      message,
    },
  });
  if (id == null) return jsonError(500, "INTERNAL_ERROR");

  await logAdminAction("contact.submit", "Contact", {
    entityId: id,
    payload: { name, phone, email: email || null, subject: subject || null },
    ip: clientIpFromRequest(req),
    userAgent: clientUserAgentFromRequest(req),
  });

  return new Response(JSON.stringify({ ok: true, data: { id } }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

/** Trim + strip HTML + hard length cap. Non-strings collapse to "". */
function clean(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return stripHtml(value).slice(0, maxLen).trim();
}
