import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Card, PageHeader, fmtDate, inputCls, toLocalInput } from "@/components/admin/ui";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ENQUIRY_STATUSES, STATUS_LABELS } from "@/lib/enquiries";
import type { Question } from "@/lib/forms";
import { can } from "@/lib/permissions";
import { telHref, whatsappHref } from "@/lib/phone";
import { addNote, updateEnquiry } from "../actions";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words">{children || "—"}</dd>
    </div>
  );
}

export default async function EnquiryDetail({ params }: PageProps<"/admin/enquiries/[id]">) {
  const user = await requireUser("enquiries.read");
  const { id } = await params;
  const e = await db.franchiseEnquiry.findUnique({
    where: { id },
    include: { form: true, owner: { select: { name: true } }, notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });
  if (!e) notFound();
  // Viewing personal data is itself recorded.
  await audit(user, "enquiry.view", { entityType: "FranchiseEnquiry", entityId: id });
  const owners = await db.adminUser.findMany({ where: { isActive: true, role: { in: ["SUPER_ADMIN", "ENQUIRY_MANAGER"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const questions = (e.form?.fields as Question[] | undefined) ?? [];
  const answers = e.answers as Record<string, string | string[]>;
  const label = (key: string) => questions.find((q) => q.name === key)?.label ?? key;
  const editable = can(user.role, "enquiries.update");

  return (
    <>
      <PageHeader title={e.fullName} description={`Received ${fmtDate(e.createdAt)}${e.anonymizedAt ? " · anonymised" : ""}`} back={{ href: "/admin/enquiries", label: "Enquiries" }} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Contact">
            <dl>
              <Row label="Mobile">
                {e.phone && (
                  <span className="flex flex-wrap gap-3">
                    <a href={telHref(e.phone)} className="text-blue-700 hover:underline">
                      {e.phone}
                    </a>
                    <a href={whatsappHref(e.phone)} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                      WhatsApp
                    </a>
                  </span>
                )}
              </Row>
              <Row label="Email">{e.email && <a href={`mailto:${e.email}`} className="text-blue-700 hover:underline">{e.email}</a>}</Row>
              <Row label="State">{e.stateName}</Row>
              <Row label="City">{e.city}</Row>
              <Row label="Message">{e.message && <span className="whitespace-pre-line">{e.message}</span>}</Row>
              {Object.entries(answers).map(([k, v]) => (
                <Row key={k} label={label(k)}>
                  {Array.isArray(v) ? v.join(", ") : v}
                </Row>
              ))}
              <Row label="Consent">{e.consent ? `Yes — “${e.consentText ?? ""}”` : "No"}</Row>
            </dl>
          </Card>
          <Card title="Source & UTM Campaign Tracking">
            <dl>
              <Row label="Form">{e.form?.name}</Row>
              <Row label="Submitted on">{e.sourcePath}</Row>
              <Row label="Landing page">{e.landingPage}</Row>
              <Row label="Traffic source">{e.trafficSource}</Row>
              <Row label="UTM Source">{e.utmSource}</Row>
              <Row label="UTM Medium">{e.utmMedium}</Row>
              <Row label="UTM Campaign">{e.utmCampaign}</Row>
              <Row label="UTM Content">{e.utmContent}</Row>
              <Row label="UTM Term">{e.utmTerm}</Row>
              <Row label="Referrer">{e.referrer}</Row>
            </dl>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Lead status">
            {editable ? (
              <ActionForm action={updateEnquiry.bind(null, e.id)} className="space-y-3 text-sm">
                <label className="block font-medium">
                  Status
                  <select name="status" defaultValue={e.status} className={`${inputCls} mt-1 block w-full`}>
                    {ENQUIRY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block font-medium">
                  Owner
                  <select name="ownerId" defaultValue={e.ownerId ?? ""} className={`${inputCls} mt-1 block w-full`}>
                    <option value="">Unassigned</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block font-medium">
                  Follow up on (India time)
                  <input type="datetime-local" name="followUpAt" defaultValue={toLocalInput(e.followUpAt)} className={`${inputCls} mt-1 block w-full`} />
                </label>
                <SubmitButton>Update</SubmitButton>
              </ActionForm>
            ) : (
              <dl>
                <Row label="Status">{STATUS_LABELS[e.status]}</Row>
                <Row label="Owner">{e.owner?.name}</Row>
                <Row label="Follow up">{fmtDate(e.followUpAt)}</Row>
              </dl>
            )}
          </Card>
          <Card title="Internal notes">
            {editable && (
              <ActionForm action={addNote.bind(null, e.id)} className="mb-4">
                <label htmlFor="note" className="sr-only">
                  New note
                </label>
                <textarea id="note" name="body" rows={3} required className={`${inputCls} block w-full`} placeholder="Call summary, next steps…" />
                <div className="mt-2">
                  <SubmitButton>Add note</SubmitButton>
                </div>
              </ActionForm>
            )}
            <ol className="space-y-3">
              {e.notes.map((n) => (
                <li key={n.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {n.author?.name ?? "Former user"} · {fmtDate(n.createdAt)}
                  </p>
                </li>
              ))}
              {!e.notes.length && <li className="text-sm text-slate-500">No notes yet.</li>}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
