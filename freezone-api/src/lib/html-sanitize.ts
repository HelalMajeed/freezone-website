import DOMPurify from "isomorphic-dompurify";

/** Strip unsafe HTML on input and before render (admin product descriptions). */
export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}
