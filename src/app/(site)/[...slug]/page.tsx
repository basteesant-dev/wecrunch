import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage, pageMetadata } from "@/components/site/SitePage";
import { getPublicPaths } from "@/lib/content";
import { resolvePath } from "@/lib/routing";

// Every public page is fully static: built at deploy time and regenerated when
// the CMS publishes (cache tag "cms"). New slugs render on first request, which
// waits for the static result so unknown URLs return a real 404 status.
export const ensureStatic = "navigation";
// params are read outside <Suspense> on purpose: unknown slugs must resolve before
// streaming starts so they get a real 404 status. Known slugs are fully static.
export const instant = false;

export async function generateStaticParams() {
  const paths = (await getPublicPaths()).map((p) => p.path).filter(Boolean);
  const unique = [...new Set(paths)];
  return unique.length ? unique.map((p) => ({ slug: p.split("/") })) : [{ slug: ["__empty__"] }];
}

export async function generateMetadata({ params }: PageProps<"/[...slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = await resolvePath(slug);
  return r.kind === "render" ? pageMetadata(r.snapshot, r.state, `/${slug.join("/")}`) : {};
}

export default async function Page({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const r = await resolvePath(slug);
  if (r.kind !== "render") notFound();
  return <SitePage snapshot={r.snapshot} state={r.state} />;
}
