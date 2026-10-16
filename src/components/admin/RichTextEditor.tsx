"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Output is sanitised again on the server before it is stored.
export function RichTextEditor({ value, onChange, id, label }: { value: string; onChange: (html: string) => void; id: string; label: string }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), Link.configure({ openOnClick: false, autolink: true })],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { id, "aria-label": label, class: "prose-cms min-h-36 px-3 py-2 focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      ul: e?.isActive("bulletList") ?? false,
      ol: e?.isActive("orderedList") ?? false,
      link: e?.isActive("link") ?? false,
    }),
  });

  if (!editor) return <div className="min-h-44 rounded-md border border-slate-300 bg-slate-50" />;

  const btn = (on: boolean | undefined) => `rounded px-2 py-1 text-sm ${on ? "bg-slate-800 text-white" : "hover:bg-slate-200"}`;
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…, /page, tel:, mailto:)", prev ?? "");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rounded-md border border-slate-300 bg-white focus-within:border-slate-500">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 p-1" role="toolbar" aria-label={`${label} formatting`}>
        <button type="button" className={btn(active?.bold)} aria-pressed={active?.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>B</b>
        </button>
        <button type="button" className={btn(active?.italic)} aria-pressed={active?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i>I</i>
        </button>
        <button type="button" className={btn(active?.h2)} aria-pressed={active?.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button type="button" className={btn(active?.h3)} aria-pressed={active?.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </button>
        <button type="button" className={btn(active?.ul)} aria-pressed={active?.ul} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • List
        </button>
        <button type="button" className={btn(active?.ol)} aria-pressed={active?.ol} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. List
        </button>
        <button type="button" className={btn(active?.link)} aria-pressed={active?.link} onClick={setLink}>
          Link
        </button>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}>
          Undo
        </button>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}>
          Redo
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
