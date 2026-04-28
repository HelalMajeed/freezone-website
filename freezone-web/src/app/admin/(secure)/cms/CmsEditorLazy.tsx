"use client";

import { Suspense, lazy } from "react";

const AdminCmsEditor = lazy(() =>
  import("@/components/admin/cms/AdminCmsEditor").then((m) => ({ default: m.AdminCmsEditor })),
);

export function CmsEditorLazy() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }} role="status" aria-live="polite">
          جاري تحميل محرّر CMS…
        </div>
      }
    >
      <AdminCmsEditor />
    </Suspense>
  );
}
