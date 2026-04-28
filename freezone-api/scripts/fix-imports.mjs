import fs from "node:fs";
import path from "node:path";

function walk(dir, fn) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, fn);
    else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) fn(p);
  }
}

walk("src", (p) => {
  let c = fs.readFileSync(p, "utf8");
  const orig = c;
  c = c.replace(/import \{ NextResponse \} from "next\/server";\r?\n?/g, "");
  c = c.replace(/NextResponse\.json/g, "Response.json");
  c = c.replace(
    /import \{ isAdminAuthenticated \} from "@\/lib\/admin-session";/g,
    'import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";',
  );
  c = c.replace(/await isAdminAuthenticated\(\)/g, "isAdminAuthenticatedFromRequest(req)");
  if (c !== orig) {
    fs.writeFileSync(p, c);
    console.log("updated", p);
  }
});
