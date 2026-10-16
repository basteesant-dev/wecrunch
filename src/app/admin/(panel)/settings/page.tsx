import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { FieldsEditor } from "@/components/admin/FieldsEditor";
import { PageHeader } from "@/components/admin/ui";
import { loadMediaPreviews, loadRefOptions } from "@/lib/admin/refs";
import { requireUser } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/content";
import { db } from "@/lib/db";
import { SETTINGS_FIELDS, SETTINGS_GROUPS } from "@/lib/settings-fields";
import { saveSettings } from "./actions";

export default async function SettingsPage() {
  await requireUser("settings.manage");
  // Read directly (not the public cache) so editors always see the saved values.
  const row = await db.siteSetting.findUnique({ where: { id: "site" } });
  const values = { ...DEFAULT_SETTINGS, ...((row?.data as object) ?? {}) };
  const [refs, media] = await Promise.all([loadRefOptions(SETTINGS_FIELDS), loadMediaPreviews(SETTINGS_FIELDS, values)]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Site settings" description="Brand, contact details, SEO defaults, enquiry routing and analytics. Changes go live immediately." />
      <ActionForm action={saveSettings}>
        <FieldsEditor fields={SETTINGS_FIELDS} groups={SETTINGS_GROUPS} initial={values} refs={refs} media={media} />
        <div className="sticky bottom-0 mt-6 border-t border-slate-200 bg-slate-100/95 py-3 backdrop-blur">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
