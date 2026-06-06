import DOMPurify from "isomorphic-dompurify";

/** Strip unsafe HTML on input and before render (admin product descriptions). */
export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}

/** Remove ALL markup — for plain-text fields (e.g. public contact form). */
export function stripHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}
