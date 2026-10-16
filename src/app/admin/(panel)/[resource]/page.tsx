import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader, Table, btn } from "@/components/admin/ui";
import { RESOURCES } from "@/lib/admin/resources";
import { requireUser } from "@/lib/auth";

export default async function ResourceList({ params, searchParams }: PageProps<"/admin/[resource]">) {
  await requireUser("content.manage");
  const { resource } = await params;
  const { deleted } = await searchParams;
  const r = RESOURCES[resource];
  if (!r) notFound();
  const rows = await r.list();
  return (
    <>
      <PageHeader
        title={r.label}
        description={r.description}
        actions={
          <Link href={`/admin/${resource}/new`} className={btn.primary}>
            New {r.singular}
          </Link>
        }
      />
      {deleted && (
        <p role="status" className="mb-4">
          <Badge color="green">Deleted</Badge>
        </p>
      )}
      <Table head={[...r.columns, ""]} empty={rows.length ? undefined : `No ${r.label.toLowerCase()} yet.`}>
        {rows.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50">
            {row.cells.map((c, i) => (
              <td key={i} className="px-4 py-2.5">
                {i === 0 ? (
                  <Link href={`/admin/${resource}/${row.id}`} className="font-medium text-slate-900 hover:underline">
                    {c}
                  </Link>
                ) : (
                  c
                )}
              </td>
            ))}
            <td className="px-4 py-2.5 text-right">
              <Link href={`/admin/${resource}/${row.id}`} className="text-blue-700 hover:underline">
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
