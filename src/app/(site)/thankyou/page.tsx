import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MessageCircle, Phone, ArrowLeft, Flame, Sparkles, TrendingUp } from "lucide-react";
import { SiteChrome } from "@/components/site/SiteChrome";
import { getNavigation, getPublicStates, getRefData, getSettings } from "@/lib/content";
import { telHref, whatsappHref, displayPhone } from "@/lib/phone";
import { resolveContact } from "@/lib/resolve";

export const metadata: Metadata = {
  title: "Thank You - Franchise Enquiry Received | WeCrunch",
  description: "Thank you for submitting your franchise enquiry with WeCrunch. Our franchise growth team will get in touch with you shortly.",
  robots: { index: false, follow: true },
};

export default async function ThankYouPage() {
  const [settings, states, nav, footerNav] = await Promise.all([
    getSettings(),
    getPublicStates(),
    getNavigation("header"),
    getNavigation("footer"),
  ]);

  const data = await getRefData({
    media: [settings.logo].filter(Boolean),
    forms: [],
    menus: [],
    galleries: [],
    models: [],
    testimonials: false,
    faqs: false,
  });

  const contact = resolveContact(settings, null, null);
  const phone = contact.phone || settings.phone || "";
  const whatsapp = contact.whatsapp || settings.whatsapp || phone;

  return (
    <SiteChrome
      settings={settings}
      contact={contact}
      logo={data.media[settings.logo]}
      nav={nav}
      footerNav={footerNav}
      anchors={new Set()}
      state={null}
    >
      <main className="min-h-[75vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-batter text-crust relative overflow-hidden">
        {/* Soft yellow/ketchup ambient circles */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-yolk/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-ketchup/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl w-full mx-auto text-center relative z-10">
          {/* Badge Icon with WeCrunch box border style */}
          <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-yolk border-3 border-crust shadow-box mb-8 text-crust">
            <CheckCircle2 className="size-11 text-crust" strokeWidth={2.5} />
          </div>

          <span className="inline-block px-3.5 py-1 rounded-full bg-fresh/15 text-fresh font-bold text-xs uppercase tracking-wider mb-3">
            Enquiry Received!
          </span>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-crust mb-4 tracking-tight leading-tight">
            You&apos;re One Step Closer to Owning a <span className="text-ketchup">WeCrunch</span>!
          </h1>

          <p className="text-base sm:text-lg text-crust-soft max-w-xl mx-auto mb-8 leading-relaxed">
            Thank you for reaching out. We have logged your details into our franchise desk. Our franchise specialist will connect with you within <span className="font-bold text-crust">24 hours</span> with complete financial breakdowns and territory availability.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            {whatsapp && (
              <a
                href={whatsappHref(whatsapp, "Hi WeCrunch Team, I just submitted an enquiry for a franchise and would love to speak to the team.")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary min-h-12 px-6 rounded-lg inline-flex items-center gap-2.5 font-bold text-base transition-all duration-200"
              >
                <MessageCircle className="size-5" />
                Chat on WhatsApp
              </a>
            )}

            {phone && (
              <a
                href={telHref(phone)}
                className="btn-outline min-h-12 px-6 rounded-lg inline-flex items-center gap-2.5 font-bold text-base transition-all duration-200"
              >
                <Phone className="size-5 text-ketchup" />
                Call {displayPhone(phone)}
              </a>
            )}

            <Link
              href="/"
              className="min-h-12 px-5 rounded-lg border-2 border-crust/20 hover:border-crust text-crust-soft hover:text-crust inline-flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to Home
            </Link>
          </div>

          {/* Highlights card in WeCrunch crust / yolk style */}
          <div className="box p-6 sm:p-8 text-left grid sm:grid-cols-3 gap-6 bg-white">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-yolk text-crust flex items-center justify-center shrink-0 border-2 border-crust shadow-box-sm">
                <Flame className="size-5 text-ketchup" />
              </div>
              <div>
                <h2 className="font-display font-bold text-crust text-base">Crowd-Favorite Flavours</h2>
                <p className="text-xs text-crust-soft mt-1">Crispy, crinkle-cut street fried chicken crafted for repeat orders.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-yolk text-crust flex items-center justify-center shrink-0 border-2 border-crust shadow-box-sm">
                <TrendingUp className="size-5 text-crust" />
              </div>
              <div>
                <h2 className="font-display font-bold text-crust text-base">High Margin Model</h2>
                <p className="text-xs text-crust-soft mt-1">Optimized kitchen ops and central supply chain ensure attractive profit margins.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-yolk text-crust flex items-center justify-center shrink-0 border-2 border-crust shadow-box-sm">
                <Sparkles className="size-5 text-ketchup" />
              </div>
              <div>
                <h2 className="font-display font-bold text-crust text-base">Turnkey Setup</h2>
                <p className="text-xs text-crust-soft mt-1">Full fryers, kitchen setup, crew training, and marketing launch included.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SiteChrome>
  );
}
