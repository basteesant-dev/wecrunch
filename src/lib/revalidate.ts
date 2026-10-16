import { revalidateTag } from "next/cache";
import { CMS_TAG } from "@/lib/content";

// Every public read is tagged "cms". Expiring it immediately means the next
// visitor gets fresh content (works in server actions and route handlers).
// ponytail: one tag for the whole site; split per page if the site grows to
// thousands of pages and regeneration cost starts to matter.
export function revalidateCms() {
  try {
    revalidateTag(CMS_TAG, { expire: 0 });
  } catch (error) {
    // Outside a Next.js request (scripts, tests) there is no cache to expire.
    if (!(error instanceof Error && /static generation store|outside a request|workStore|without a work/i.test(error.message))) throw error;
  }
}
