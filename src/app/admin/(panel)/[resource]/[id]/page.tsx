import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { FieldsEditor } from "@/components/admin/FieldsEditor";
import { Badge, PageHeader } from "@/components/admin/ui";
import { loadMediaPreviews, loadRefOptions } from "@/lib/admin/refs";
import { RESOURCES } from "@/lib/admin/resources";
import { requireUser } from "@/lib/auth";
import { emptyValues } from "@/lib/fields";
import { deleteResource, saveResource } from "../actions";

// Sensible defaults for new records (booleans otherwise start unticked).
const NEW_DEFAULTS = { isPublished: true, rating: 5, permanent: true, showState: true, showMessage: true, requireConsent: true, status: "ENQUIRY_ONLY", submitLabel: "Submit Enquiry" };

export default async function ResourceEdit({ params, searchParams }: PageProps<"/admin/[resource]/[id]">) {
  await requireUser("content.manage");
  const { resource, id } = await params;
  const { created } = await searchParams;
  const r = RESOURCES[resource];
  if (!r) notFound();
  const isNew = id === "new";
  const empty = emptyValues(r.fields);
  const values = isNew
    ? { ...empty, ...Object.fromEntries(Object.entries(NEW_DEFAULTS).filter(([k]) => k in empty)) }
    : await r.load(id);
  if (!values) notFound();
  const [refs, media] = await Promise.all([loadRefOptions(r.fields), loadMediaPreviews(r.fields, values)]);
  const title = isNew ? `New ${r.singular}` : String(values.name ?? values.question ?? values.fromPath ?? r.singular);
  return (
    <div className="max-w-3xl">
      <PageHeader title={title} description={r.description} back={{ href: `/admin/${resource}`, label: r.label }} />
      {created && (
        <p role="status" className="mb-4">
          <Badge color="green">Created</Badge>
        </p>
      )}
      <ActionForm action={saveResource.bind(null, resource, isNew ? null : id)} className="rounded-lg border border-slate-200 bg-white p-6">
        <FieldsEditor fields={r.fields} initial={values} refs={refs} media={media} />
        <div className="mt-6 border-t border-slate-200 pt-4">
          <SubmitButton>{isNew ? `Create ${r.singular}` : "Save changes"}</SubmitButton>
        </div>
      </ActionForm>
      {!isNew && (
        <ActionForm action={deleteResource.bind(null, resource, id)} className="mt-6">
          <SubmitButton variant="danger" confirm={`Delete this ${r.singular}? This cannot be undone.`}>
            Delete {r.singular}
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
