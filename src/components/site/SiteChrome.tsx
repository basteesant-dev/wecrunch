import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { Media, PublicState } from "@/lib/content";
import { displayPhone, telHref, whatsappHref } from "@/lib/phone";
import type { Contact } from "@/lib/resolve";
import type { SiteSettings } from "@/lib/settings-fields";
import { MobileNav } from "./MobileNav";
import { ScrollReveal } from "./ScrollReveal";
import { ContactDetails, MapEmbed } from "./sections";
import { Container, MediaImage } from "./ui";

type NavItem = { label: string; href: string; openInNewTab: boolean };

function NavLink({ item, className }: { item: NavItem; className: string }) {
  return (
    <a href={item.href} className={className} {...(item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {item.label}
    </a>
  );
}

export function SiteChrome({
  settings,
  contact,
  logo,
  nav,
  footerNav,
  anchors,
  state,
  children,
}: {
  settings: SiteSettings;
  contact: Contact;
  logo?: Media;
  nav: NavItem[];
  footerNav: NavItem[];
  anchors: Set<string>;
  state: PublicState | null;
  children: ReactNode;
}) {
  // In-page links (#about) only make sense where that section exists.
  const links = nav.filter((n) => !n.href.startsWith("#") || anchors.has(n.href.slice(1)));
  const changeText = settings.chooseStateText || "Change state";
  const siteUrl = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: settings.siteName,
        legalName: settings.companyName || undefined,
        url: siteUrl,
        logo: logo ? new URL(logo.url, siteUrl).toString() : undefined,
        telephone: settings.phone ? telHref(settings.phone).slice(4) : undefined,
        email: settings.email || undefined,
        address: settings.address ? { "@type": "PostalAddress", streetAddress: settings.address.replace(/\n/g, " "), addressCountry: "IN" } : undefined,
        sameAs: settings.socials.map((s) => s.url),
      },
      // Lets Google show the brand as the site name in results.
      { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: settings.siteName, url: siteUrl, inLanguage: "en-IN", publisher: { "@id": `${siteUrl}/#organization` } },
    ],
  };

  return (
    <>
      <a href="#main" className="sr-only z-[60] rounded bg-white px-4 py-2 text-crust focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b-3 border-crust bg-crust text-batter">
        {settings.announcementEnabled && settings.announcementText && (
          <div className="bg-ketchup px-4 py-2 text-center font-bold text-white">
            {settings.announcementHref ? (
              <a href={settings.announcementHref} className="underline underline-offset-2">
                {settings.announcementText}
              </a>
            ) : (
              settings.announcementText
            )}
          </div>
        )}
        <Container className="relative flex h-24 items-center justify-between gap-6">
          <Link href="/" className="shrink-0" aria-label={`${settings.siteName} — choose your state`}>
            {logo ? (
              <MediaImage media={logo} alt={settings.logoAlt || settings.siteName} sizes="240px" priority className="h-[5.5rem] w-auto" />
            ) : (
              <span className="font-display text-3xl text-yolk">{settings.siteName}</span>
            )}
          </Link>
          <nav aria-label="Main" className="hidden flex-1 lg:block">
            <ul className="flex gap-8">
              {links.map((n) => (
                <li key={n.href + n.label}>
                  <NavLink item={n} className="text-lg font-semibold text-batter/85 transition hover:text-yolk" />
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            {state && (
              <Link href="/" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-batter/85 hover:bg-white/10 hover:text-yolk md:inline-flex">
                <MapPin className="size-4 text-yolk" aria-hidden="true" />
                <span>
                  {state.name}
                  <span className="sr-only"> — {changeText}</span>
                </span>
                <span aria-hidden="true" className="text-sm underline underline-offset-2">
                  {changeText}
                </span>
              </Link>
            )}
            {contact.phone && (
              <a
                href={telHref(contact.phone)}
                className="hidden min-h-11 items-center gap-2 rounded-lg border-3 border-yolk bg-yolk px-4 font-bold text-crust transition hover:bg-[#ffe14d] sm:inline-flex"
              >
                <Phone className="size-4" aria-hidden="true" />
                <span className="sr-only">Call </span>
                {displayPhone(contact.phone)}
              </a>
            )}
            <MobileNav>
              <nav aria-label="Mobile">
                <ul className="space-y-1">
                  {links.map((n) => (
                    <li key={n.href + n.label}>
                      <NavLink item={n} className="block rounded-lg px-3 py-3 text-lg hover:bg-white/10" />
                    </li>
                  ))}
                  <li>
                    <Link href="/" className="block rounded-lg px-3 py-3 text-lg hover:bg-white/10">
                      {state ? `${state.name}: ${changeText}` : "Choose your state"}
                    </Link>
                  </li>
                </ul>
                {contact.phone && (
                  <a href={telHref(contact.phone)} className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-yolk font-bold text-crust">
                    <Phone className="size-4" aria-hidden="true" />
                    Call {displayPhone(contact.phone)}
                  </a>
                )}
              </nav>
            </MobileNav>
          </div>
        </Container>
      </header>

      <ScrollReveal />
      <main id="main">{children}</main>

      <footer className="on-crust bg-crust text-batter">
        <Container className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[0.7fr_1.2fr_1.1fr]">
          <div>
            {logo && <MediaImage media={logo} alt={settings.logoAlt || settings.siteName} sizes="240px" className="h-20 w-auto" />}
            {settings.tagline && <p className="mt-4 font-display text-2xl font-extrabold text-yolk">{settings.tagline}</p>}
          </div>
          <div>
            <h2 className="mb-5 text-3xl text-yolk">Location</h2>
            <ContactDetails ctx={{ contact, settings }} />
          </div>
          <MapEmbed query={settings.mapQuery || settings.address} className="md:col-span-2 lg:col-span-1" />
        </Container>
        <div className="border-t border-white/10">
          <Container className="flex flex-col gap-4 py-6 text-batter/75 md:flex-row md:items-center md:justify-between">
            <p>{settings.copyright || `© ${settings.siteName}`}</p>
            <nav aria-label="Legal">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {footerNav.map((n) => (
                  <li key={n.href + n.label}>
                    <NavLink item={n} className="hover:text-yolk hover:underline" />
                  </li>
                ))}
                {settings.socials.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-yolk hover:underline">
                      {s.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </Container>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c") }} />
      </footer>

      {contact.whatsapp && (
        <a
          href={whatsappHref(contact.whatsapp, `Hi ${settings.siteName}, I'm interested in a franchise.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-xl"
          aria-label="Chat with us on WhatsApp"
        >
          <MessageCircle className="size-7" aria-hidden="true" />
        </a>
      )}
    </>
  );
}
