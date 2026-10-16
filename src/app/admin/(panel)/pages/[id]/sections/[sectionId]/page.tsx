import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { FieldsEditor } from "@/components/admin/FieldsEditor";
import { PreviewPanel } from "@/components/admin/PreviewPanel";
import { Card, PageHeader } from "@/components/admin/ui";
import { loadMediaPreviews, loadRefOptions } from "@/lib/admin/refs";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Field } from "@/lib/fields";
import { SECTION_SETTINGS_FIELDS, SECTION_TYPES, isSectionType } from "@/lib/sections/registry";
import { saveSection } from "../../../actions";

const SCOPE_FIELDS: Field[] = [
  {
    name: "stateIds",
    label: "Show this section only to visitors from",
    type: "ref",
    ref: "state",
    multiple: true,
    help: "Leave empty to show it to everyone (brand-wide).",
  },
  {
    name: "key",
    label: "Override key",
    type: "text",
    help: "Give a brand-wide section and a state-specific section the same key: visitors from those states see the state version in its place.",
  },
];

export default async function SectionEditor({ params }: PageProps<"/admin/pages/[id]/sections/[sectionId]">) {
  await requireUser("content.manage");
  const { id, sectionId } = await params;
  const section = await db.pageSection.findUnique({ where: { id: sectionId }, include: { states: { select: { id: true } }, page: { select: { id: true, title: true } } } });
  if (!section || section.pageId !== id || !isSectionType(section.type)) notFound();
  const type = SECTION_TYPES[section.type];
  const settingsFields = SECTION_SETTINGS_FIELDS(section.type);
  const content = section.content as Record<string, unknown>;
  const [refs, scopeRefs, media, states] = await Promise.all([
    loadRefOptions(type.fields),
    loadRefOptions(SCOPE_FIELDS),
    loadMediaPreviews(type.fields, content),
    db.state.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title={type.label} description={type.description} back={{ href: `/admin/pages/${id}`, label: section.page.title }} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ActionForm action={saveSection.bind(null, id, sectionId)} className="space-y-6">
          <Card title="Content">
            <FieldsEditor name="content" fields={type.fields} initial={content} refs={refs} media={media} />
          </Card>
          <Card title="Layout & style">
            <FieldsEditor name="settings" fields={settingsFields} initial={section.settings as Record<string, unknown>} />
          </Card>
          <Card title="Who sees this section">
            <FieldsEditor name="scope" fields={SCOPE_FIELDS} refs={scopeRefs} initial={{ stateIds: section.states.map((s) => s.id), key: section.key ?? "" }} />
          </Card>
          <div className="sticky bottom-0 -mx-1 border-t border-slate-200 bg-slate-100/95 px-1 py-3 backdrop-blur">
            <SubmitButton>Save section</SubmitButton>
            <span className="ml-3 text-sm text-slate-500">Saves the draft. Publish from the page screen.</span>
          </div>
        </ActionForm>
        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card title="Draft preview">
            <PreviewPanel pageId={id} states={states} />
          </Card>
        </div>
      </div>
    </>
  );
}
