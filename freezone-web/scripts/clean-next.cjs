/**
 * يحذف مجلد `.next` (كاش التطوير/البناء).
 * يُستخدم عند أخطاء ENOENT في webpack أو ملفات page.js المفقودة بعد تحريك الملفات أو تعطّل البناء.
 * تشغيل: npm run clean
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("[clean] تم حذف .next");
} else {
  console.log("[clean] لا يوجد مجلد .next — لا شيء للحذف");
}

const nodeCache = path.join(root, "node_modules", ".cache");
if (fs.existsSync(nodeCache)) {
  fs.rmSync(nodeCache, { recursive: true, force: true });
  console.log("[clean] تم حذف node_modules/.cache");
}
