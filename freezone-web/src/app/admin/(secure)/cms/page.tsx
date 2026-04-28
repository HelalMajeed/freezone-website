import { AdminCmsDraftProvider } from "@/contexts/AdminCmsDraftContext";
import { CmsEditorLazy } from "./CmsEditorLazy";

export default function AdminCmsPage() {
  return (
    <AdminCmsDraftProvider>
      <CmsEditorLazy />
    </AdminCmsDraftProvider>
  );
}
