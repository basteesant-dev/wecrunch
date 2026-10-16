import { notFound } from "next/navigation";
import { SitePage } from "@/components/site/SitePage";
import { requireUser } from "@/lib/auth";
import { getPublicState } from "@/lib/content";
import { buildSnapshot } from "@/lib/pages";

export const instant = false;

// Renders the current DRAFT (never cached, never indexed) for editors.
export default async function Preview({ params, searchParams }: PageProps<"/admin/preview/[id]">) {
  await requireUser("content.manage");
  const { id } = await params;
  const { state: stateSlug } = await searchParams;
  const { snapshot } = await buildSnapshot(id).catch(() => notFound());
  const state = typeof stateSlug === "string" ? await getPublicState(stateSlug) : null;
  return <SitePage snapshot={snapshot} state={state} />;
}
