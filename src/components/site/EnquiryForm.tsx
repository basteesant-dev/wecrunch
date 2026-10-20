"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { captureAttribution } from "@/lib/attribution";
import type { FormDef } from "@/lib/content";
import type { Question } from "@/lib/forms";

// Local copy keeps zod out of the client bundle.
const choices = (q: Question) => q.options.split(/\r?\n/).map((o) => o.trim()).filter(Boolean);

type StateOption = { slug: string; name: string; status: string };

const input =
  "block min-h-12 w-full rounded-control border-2 border-crust bg-batter px-3.5 py-2.5 text-base text-crust placeholder:text-crust-soft/70 focus:bg-white focus:outline-none focus-visible:outline-3 focus-visible:outline-ketchup";

// Country codes for the mobile field. India first; the server validates the full number.
const DIAL_CODES = [
  ["IN", "+91"], ["LK", "+94"], ["AE", "+971"], ["SA", "+966"], ["QA", "+974"], ["OM", "+968"], ["KW", "+965"], ["BH", "+973"],
  ["SG", "+65"], ["MY", "+60"], ["NP", "+977"], ["BD", "+880"], ["GB", "+44"], ["US", "+1"], ["AU", "+61"],
] as const;

export function EnquiryForm({
  form,
  states,
  defaultState,
  cities,
  title,
  variant = "card",
  compact = false,
}: {
  form: FormDef;
  states: StateOption[];
  defaultState?: string;
  cities: string[];
  title?: string;
  variant?: "card" | "plain";
  /** Hero use: paired fields, dropdown answers, no optional message, so it fits one screen. */
  compact?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    captureAttribution();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status !== "idle") return; // prevents double submits
    const fd = new FormData(e.currentTarget);
    const answers: Record<string, string | string[]> = {};
    for (const q of form.questions) {
      answers[q.name] = q.type === "checkboxes" ? (fd.getAll(`q_${q.name}`) as string[]) : String(fd.get(`q_${q.name}`) ?? "");
    }
    setStatus("sending");
    setError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          fullName: fd.get("fullName"),
          email: fd.get("email"),
          // A number typed with its own "+code" wins over the picker.
          phone: String(fd.get("phone") ?? "").trim().startsWith("+") ? fd.get("phone") : `${fd.get("dialCode") ?? "+91"} ${fd.get("phone") ?? ""}`,
          stateSlug: fd.get("stateSlug") ?? defaultState ?? "",
          city: fd.get("city") ?? "",
          message: fd.get("message") ?? "",
          answers,
          consent: fd.get("consent") === "on",
          website: fd.get("website") ?? "",
          turnstileToken: fd.get("cf-turnstile-response") ?? undefined,
          sourcePath: location.pathname,
          attribution: captureAttribution(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMessage(data.message || form.successMessage);
        setStatus("done");
        ref.current?.reset();
        return;
      }
      setError(data.error || "Something went wrong. Please try again or call us.");
      setFieldErrors(data.fieldErrors ?? {});
    } catch {
      setError("Could not send your enquiry. Please check your connection and try again.");
    }
    setStatus("idle");
  }

  const err = (name: string) =>
    fieldErrors[name] ? (
      <p id={`${id}-${name}-err`} className="mt-1 text-sm font-medium text-danger">
        {fieldErrors[name]}
      </p>
    ) : null;
  const a11y = (name: string, required = true) => ({
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `${id}-${name}-err` : undefined,
    required,
  });
  const label = (htmlFor: string, text: string, required = true) => (
    <label htmlFor={htmlFor} className={`field-label block font-semibold ${compact ? "mb-1 text-[0.95rem] short:mb-0.5 short:leading-tight" : "mb-1.5"}`}>
      {text}
      {required && <span aria-hidden="true"> *</span>}
    </label>
  );

  const field = compact ? input.replace("min-h-12", "min-h-11 short:min-h-10").replace("py-2.5", "py-2 short:py-1.5") : input;
  const wrapper = variant === "card" ? `form-card box ${compact ? "p-5 sm:p-6 short:py-4" : "p-6 sm:p-8"}` : "form-card";

  if (status === "done") {
    return (
      <div className={wrapper} role="status" aria-live="polite">
        <h2 className="font-display text-3xl font-extrabold">{title || form.title}</h2>
        <p className="mt-4 text-lg">{message}</p>
        <button type="button" className="btn-submit mt-6 min-h-12 rounded-lg px-6 font-semibold" onClick={() => setStatus("idle")}>
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className={wrapper} aria-labelledby={`${id}-title`} data-form-id={form.id}>
      <h2 id={`${id}-title`} className={`${compact ? "mb-4 text-[1.85rem] short:mb-2 short:text-[1.55rem]" : "mb-6 text-[2rem]"} font-display font-extrabold leading-tight`}>
        {title || form.title}
      </h2>
      <div className={compact ? "space-y-2.5 short:space-y-2" : "space-y-4"}>
        <div className={compact ? "grid items-end gap-x-4 gap-y-2.5 short:gap-y-2 sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2" : "space-y-4"}>
        <div>
          {label(`${id}-name`, "Name")}
          <input id={`${id}-name`} name="fullName" autoComplete="name" className={field} {...a11y("fullName")} />
          {err("fullName")}
        </div>
        <div>
          {label(`${id}-email`, "Email")}
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" className={field} placeholder="you@domain.com" {...a11y("email")} />
          {err("email")}
        </div>
        <div>
          {label(`${id}-phone`, "Mobile")}
          <div className="flex">
            <select name="dialCode" defaultValue="+91" aria-label="Country code" autoComplete="tel-country-code" className={`${field.replace("w-full", "w-auto").replace("px-3.5", "pl-3 pr-1")} shrink-0 rounded-r-none border-r-0 font-semibold`}>
              {DIAL_CODES.map(([cc, code]) => (
                <option key={cc} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="98765 43210" className={`${field} min-w-0 rounded-l-none pl-3`} {...a11y("phone")} />
          </div>
          {err("phone")}
        </div>
        {form.showState && !(compact && defaultState) && (
          <div>
            {label(`${id}-state`, "State")}
            <select id={`${id}-state`} name="stateSlug" defaultValue={defaultState ?? ""} className={field} {...a11y("stateSlug")}>
              <option value="">- Select -</option>
              {states.map((s) => (
                <option key={s.slug} value={s.slug} disabled={s.status === "UNAVAILABLE"}>
                  {s.name}
                  {s.status === "UNAVAILABLE" ? " (not available)" : ""}
                </option>
              ))}
            </select>
            {err("stateSlug")}
          </div>
        )}
        <div>
          {label(`${id}-city`, "City")}
          <input id={`${id}-city`} name="city" autoComplete="address-level2" list={cities.length ? `${id}-cities` : undefined} className={field} {...a11y("city")} />
          {cities.length > 0 && (
            <datalist id={`${id}-cities`}>
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          )}
          {err("city")}
        </div>

        {form.questions.map((q) => {
          const name = `q_${q.name}`;
          if (q.type === "text" || q.type === "textarea") {
            const Tag = q.type === "textarea" ? "textarea" : "input";
            return (
              <div key={q.name}>
                {label(`${id}-${q.name}`, q.label, q.required)}
                <Tag id={`${id}-${q.name}`} name={name} className={field} rows={3} {...a11y(q.name, q.required)} />
                {err(q.name)}
              </div>
            );
          }
          if (q.type === "select" || (compact && q.type === "radio")) {
            return (
              <div key={q.name}>
                {label(`${id}-${q.name}`, q.label, q.required)}
                <select id={`${id}-${q.name}`} name={name} className={field} defaultValue="" {...a11y(q.name, q.required)}>
                  <option value="">- Select -</option>
                  {choices(q).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {err(q.name)}
              </div>
            );
          }
          return (
            <fieldset key={q.name} aria-describedby={fieldErrors[q.name] ? `${id}-${q.name}-err` : undefined}>
              <legend className="field-label mb-2 font-semibold">
                {q.label}
                {q.required && <span aria-hidden="true"> *</span>}
              </legend>
              <div className="space-y-1.5">
                {choices(q).map((c) => (
                  <label key={c} className="flex min-h-8 cursor-pointer items-center gap-3">
                    <input type={q.type === "radio" ? "radio" : "checkbox"} name={name} value={c} required={q.required && q.type === "radio"} className="size-[1.1rem] accent-[#d7261e]" />
                    {c}
                  </label>
                ))}
              </div>
              {err(q.name)}
            </fieldset>
          );
        })}
        </div>

        {form.showMessage && !compact && (
          <div>
            {label(`${id}-message`, "Message", false)}
            <textarea id={`${id}-message`} name="message" rows={3} className={field} placeholder="Interested in Franchise" />
          </div>
        )}

        {(form.requireConsent || form.consentText) && (
          <div>
            <label className={`flex items-start gap-3 leading-snug text-crust-soft ${compact ? "text-sm" : "text-[0.95rem]"}`}>
              <input type="checkbox" name="consent" className="mt-1 size-[1.1rem] shrink-0 accent-[#d7261e]" {...a11y("consent", form.requireConsent)} />
              <span>
                {form.consentText}{" "}
                <Link href="/privacy-policy" className="underline underline-offset-2">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {err("consent")}
          </div>
        )}

        {/* Honeypot: hidden from people and assistive tech, often filled by bots. */}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            Website <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {turnstileKey && (
          <>
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
            <div className="cf-turnstile" data-sitekey={turnstileKey} />
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 font-medium text-danger">
            {error}
          </p>
        )}
        <div className={compact ? "pt-1" : "pt-2"}>
          <button
            type="submit"
            disabled={status === "sending"}
            className={`btn-submit inline-flex w-full items-center justify-center rounded-control px-8 font-bold transition disabled:opacity-60 ${compact ? "min-h-12 py-2.5 text-lg short:min-h-11 short:py-2" : "min-h-13 py-3 text-lg"}`}
          >
            {status === "sending" ? "Sending…" : form.submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
