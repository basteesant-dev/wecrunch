import Link from "next/link";
import { Badge, Card, PageHeader, Table, btn } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

function lengthBadge(text: string | null, min: number, max: number) {
  if (!text) return <Badge color="amber">Missing</Badge>;
  if (text.length < min) return <Badge color="amber">Short ({text.length})</Badge>;
  if (text.length > max) return <Badge color="amber">Long ({text.length})</Badge>;
  return <Badge color="green">{text.length} chars</Badge>;
}

export default async function SeoPage() {
  await requireUser("content.manage");
  const [pages, states, redirects] = await Promise.all([
    db.page.findMany({ orderBy: { slug: "asc" } }),
    db.state.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { name: "asc" } }),
    db.redirect.count(),
  ]);
  return (
    <>
      <PageHeader
        title="SEO & redirects"
        description="Titles and descriptions appear in Google results and link previews. The sitemap and robots.txt are generated automatically."
        actions={
          <>
            <a href="/sitemap.xml" target="_blank" rel="noopener" className={btn.secondary}>
              View sitemap
            </a>
            <Link href="/admin/redirects" className={btn.primary}>
              Manage redirects ({redirects})
            </Link>
          </>
        }
      />
      <Card title="Pages" className="mb-6">
        <Table head={["Page", "SEO title", "Description", "Indexing", ""]}>
          {pages.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2.5 font-medium">{p.title}</td>
              <td className="px-4 py-2.5">{p.seoTitle ? lengthBadge(p.seoTitle, 15, 60) : <span className="text-slate-500">Uses title</span>}</td>
              <td className="px-4 py-2.5">{lengthBadge(p.seoDescription, 70, 160)}</td>
              <td className="px-4 py-2.5">{p.noIndex ? <Badge color="red">noindex</Badge> : <Badge color="green">Indexed when published</Badge>}</td>
              <td className="px-4 py-2.5 text-right">
                <Link href={`/admin/pages/${p.id}`} className="text-blue-700 hover:underline">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="State pages">
        <p className="mb-3 text-sm text-slate-600">Without overrides, state pages use their landing page&apos;s title with the state name added.</p>
        <Table head={["State", "SEO title", "Description", ""]}>
          {states.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-2.5 font-medium">{s.name}</td>
              <td className="px-4 py-2.5">{s.seoTitle ? lengthBadge(s.seoTitle, 15, 60) : <span className="text-slate-500">Automatic</span>}</td>
              <td className="px-4 py-2.5">{s.seoDescription ? lengthBadge(s.seoDescription, 70, 160) : <span className="text-slate-500">From landing page</span>}</td>
              <td className="px-4 py-2.5 text-right">
                <Link href={`/admin/states/${s.id}`} className="text-blue-700 hover:underline">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
