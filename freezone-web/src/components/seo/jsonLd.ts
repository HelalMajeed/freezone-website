/**
 * Serialize a value for safe injection into a `<script type="application/ld+json">`.
 *
 * `JSON.stringify` does NOT escape `<`, `>` or `&`, so attacker-influenced
 * fields (product name/description from the importer, CMS-controlled copy) could
 * contain `</script>...` and break out of the script element (stored XSS).
 * Escaping these to their `\uXXXX` forms keeps the JSON valid while making it
 * impossible to terminate the script tag or open an HTML comment.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
