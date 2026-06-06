/**
 * Error-code → bilingual message map.
 *
 * Codes come from the frozen API contracts (`fz-ws1-backend/docs/API_CONTRACTS.md`,
 * § Conventions + per-endpoint codes) plus client-side failure modes. Unknown
 * codes fall back to `INTERNAL_ERROR` copy, so feature pages can always render
 * `formatError(err)` without guarding.
 */
export type BilingualMessage = { en: string; ar: string };

export const DASHBOARD_ERROR_MESSAGES: Record<string, BilingualMessage> = {
  // ── Contract conventions (§0) ────────────────────────────────────────────
  UNAUTHORIZED: {
    en: "Your session has expired — please sign in again.",
    ar: "انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجددًا.",
  },
  FORBIDDEN: {
    en: "You don't have permission to do that.",
    ar: "ليست لديك الصلاحية للقيام بذلك.",
  },
  NOT_FOUND: {
    en: "The requested item was not found.",
    ar: "العنصر المطلوب غير موجود.",
  },
  VALIDATION: {
    en: "Some fields are invalid — please review and try again.",
    ar: "بعض الحقول غير صالحة — يرجى المراجعة والمحاولة مجددًا.",
  },
  CONFLICT: {
    en: "This change conflicts with the current state.",
    ar: "هذا التغيير يتعارض مع الحالة الحالية.",
  },
  RATE_LIMITED: {
    en: "Too many requests — please wait a moment.",
    ar: "طلبات كثيرة جدًا — يرجى الانتظار قليلًا.",
  },
  NO_DATABASE: {
    en: "The database is not available right now.",
    ar: "قاعدة البيانات غير متاحة حاليًا.",
  },
  INTERNAL_ERROR: {
    en: "Something went wrong — please try again.",
    ar: "حدث خطأ ما — يرجى المحاولة مجددًا.",
  },

  // ── Orders (contracts b, c) ──────────────────────────────────────────────
  USE_CANCEL_ENDPOINT: {
    en: "Use the cancel action to cancel an order (stock restore is explicit).",
    ar: "استخدم إجراء الإلغاء لإلغاء الطلب (استرجاع المخزون يتم صراحة).",
  },
  ALREADY_CANCELLED: {
    en: "This order is already cancelled.",
    ar: "هذا الطلب ملغى مسبقًا.",
  },
  ALREADY_DELIVERED: {
    en: "Delivered orders can't be cancelled.",
    ar: "لا يمكن إلغاء الطلبات المسلَّمة.",
  },

  // ── CSV import (existing endpoint codes) ─────────────────────────────────
  MISSING_CSV: {
    en: "CSV content is required.",
    ar: "محتوى CSV مطلوب.",
  },
  EMPTY: {
    en: "The CSV file has no data rows.",
    ar: "لا توجد صفوف بيانات في ملف CSV.",
  },
  TOO_MANY: {
    en: "The CSV file has too many rows (max 500).",
    ar: "عدد الصفوف في ملف CSV كبير جدًا (الحد 500).",
  },

  // ── Team management (/api/dashboard/users) ───────────────────────────────
  EMAIL_TAKEN: {
    en: "This email is already in use.",
    ar: "هذا البريد الإلكتروني مستخدم مسبقًا.",
  },
  INVALID_EMAIL: {
    en: "Enter a valid email address.",
    ar: "أدخل بريدًا إلكترونيًا صالحًا.",
  },
  MISSING_NAME: {
    en: "The name is required.",
    ar: "الاسم مطلوب.",
  },
  INVALID_ROLE: {
    en: "That role is not valid.",
    ar: "الصلاحية غير صالحة.",
  },
  PASSWORD_TOO_SHORT: {
    en: "The password must be at least 8 characters.",
    ar: "كلمة المرور يجب أن تكون ٨ أحرف على الأقل.",
  },
  LAST_SUPERADMIN: {
    en: "You can't remove or demote the last active super admin.",
    ar: "لا يمكن حذف أو تخفيض آخر مدير عام نشط.",
  },
  CANT_DELETE_SELF: {
    en: "You can't delete your own account.",
    ar: "لا يمكن حذف حسابك الحالي.",
  },
  USER_NOT_FOUND: {
    en: "This team member was not found.",
    ar: "هذا العضو غير موجود.",
  },
  NOTHING_TO_UPDATE: {
    en: "There is nothing to update.",
    ar: "لا يوجد ما يُحدَّث.",
  },

  // ── Category templates ───────────────────────────────────────────────────
  UNKNOWN_TEMPLATE: {
    en: "Unknown category template.",
    ar: "قالب قسم غير معروف.",
  },

  // ── Media import-from-URL (ws3-operations) ──────────────────────────────
  INVALID_URL: {
    en: "That URL is not valid.",
    ar: "رابط غير صالح.",
  },
  INVALID_PROTOCOL: {
    en: "Only http(s) URLs are allowed.",
    ar: "يُسمح فقط بروابط http أو https.",
  },
  BLOCKED_HOST: {
    en: "That URL is not allowed.",
    ar: "الرابط غير مسموح.",
  },
  BLOCKED_IP: {
    en: "That URL is not allowed.",
    ar: "الرابط غير مسموح.",
  },
  BLOCKED_DNS: {
    en: "The URL points to a blocked local network.",
    ar: "الرابط يشير إلى شبكة محلية غير مسموحة.",
  },
  DNS_FAILED: {
    en: "Couldn't resolve the URL's host.",
    ar: "تعذّر التحقق من عنوان الرابط.",
  },
  TOO_LARGE: {
    en: "The image is larger than the 15 MB limit.",
    ar: "الصورة أكبر من الحد المسموح (15MB).",
  },
  TOO_SMALL: {
    en: "The file is too small or corrupted.",
    ar: "الملف صغير جداً أو تالف.",
  },
  NOT_IMAGE: {
    en: "The URL doesn't point to a valid image.",
    ar: "الرابط لا يشير إلى صورة صالحة.",
  },
  FETCH_FAILED: {
    en: "Couldn't download the image — make sure the URL links directly to an image.",
    ar: "تعذّر تنزيل الصورة. تأكد أن الرابط مباشر لصورة.",
  },

  // ── Client-side failure modes ────────────────────────────────────────────
  BAD_JSON: {
    en: "The server returned an unexpected response.",
    ar: "أعاد الخادم استجابة غير متوقعة.",
  },
  NETWORK: {
    en: "Network error — check your connection and try again.",
    ar: "خطأ في الشبكة — تحقق من الاتصال وحاول مجددًا.",
  },
  TIMEOUT: {
    en: "The request timed out — please try again.",
    ar: "انتهت مهلة الطلب — يرجى المحاولة مجددًا.",
  },
};

/** HTTP-status fallbacks for errors that carry no contract code (`HTTP_404` …). */
const HTTP_STATUS_FALLBACK: Record<number, keyof typeof DASHBOARD_ERROR_MESSAGES> = {
  400: "VALIDATION",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  503: "NO_DATABASE",
};

/** Resolve an error code (or `HTTP_<status>` synthetic code) to a bilingual message. */
export function dashboardErrorByCode(code: string): BilingualMessage {
  const direct = DASHBOARD_ERROR_MESSAGES[code];
  if (direct) return direct;
  const httpMatch = /^HTTP_(\d{3})$/.exec(code);
  if (httpMatch) {
    const mapped = HTTP_STATUS_FALLBACK[Number(httpMatch[1])];
    if (mapped) return DASHBOARD_ERROR_MESSAGES[mapped];
  }
  return DASHBOARD_ERROR_MESSAGES.INTERNAL_ERROR;
}
