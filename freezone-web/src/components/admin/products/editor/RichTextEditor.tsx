"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect } from "react";
import { sanitizeRichHtml } from "@/lib/admin/sanitize-html";

export function RichTextEditor({
  value,
  onChange,
  label,
  dir = "rtl",
}: {
  value: string;
  onChange: (html: string) => void;
  label: string;
  dir?: "rtl" | "ltr";
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true }),
    ],
    content: sanitizeRichHtml(value || ""),
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeRichHtml(ed.getHTML()));
    },
    editorProps: {
      attributes: {
        dir,
        class: "product-rich-editor",
        style:
          "min-height:160px;padding:10px;border:1px solid var(--admin-border,#334155);border-radius:8px;background:var(--admin-surface,#0f172a);color:var(--admin-text,#e2e8f0)",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const safe = sanitizeRichHtml(value || "");
    if (editor.getHTML() !== safe) editor.commands.setContent(safe, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>
          عريض
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>
          مائل
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          قائمة
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("رابط");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          رابط
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
