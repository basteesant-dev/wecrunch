"use client";

import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { forecast, rupees } from "@/lib/roi";

type Cost = { label: string; note?: string };
export type RoiConfig = {
  investment: number;
  dailySales: number;
  daysPerMonth: number;
  scenarios: { label: string; dailySales: number }[];
  fixedCosts: (Cost & { amount: number })[];
  variableCosts: (Cost & { percent: number })[];
  disclaimer?: string;
};

const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0));
const field =
  "w-full rounded-control border-2 border-crust bg-batter px-3 py-2 text-right text-lg font-semibold tabular-nums text-crust focus:bg-white focus:outline-none focus-visible:outline-3 focus-visible:outline-ketchup";

export function RoiCalculator({ config }: { config: RoiConfig }) {
  const id = useId();
  const [daily, setDaily] = useState(config.dailySales);
  const [fixed, setFixed] = useState(config.fixedCosts.map((c) => c.amount));
  const [pct, setPct] = useState(config.variableCosts.map((c) => c.percent));

  const run = (dailySales: number) =>
    forecast({
      dailySales,
      daysPerMonth: config.daysPerMonth,
      investment: config.investment,
      fixed: config.fixedCosts.map((c, i) => ({ label: c.label, amount: fixed[i] })),
      variable: config.variableCosts.map((c, i) => ({ label: c.label, percent: pct[i] })),
    });
  const f = run(daily);
  const sliderMax = Math.max(30000, ...config.scenarios.map((s) => s.dailySales * 1.5), daily);
  const profitShare = f.turnover > 0 ? Math.min(100, Math.max(0, (f.profit / f.turnover) * 100)) : 0;
  const reset = () => {
    setDaily(config.dailySales);
    setFixed(config.fixedCosts.map((c) => c.amount));
    setPct(config.variableCosts.map((c) => c.percent));
  };

  return (
    <div>
      {config.scenarios.length > 0 && (
        <ul className="mb-14 grid gap-6 sm:grid-cols-3" aria-label="Sales scenarios">
          {config.scenarios.map((s, i) => {
            const r = run(s.dailySales);
            const active = s.dailySales === daily;
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDaily(s.dailySales)}
                  className={`block w-full rounded-2xl border-3 border-crust p-5 text-left text-crust transition ${
                    active ? "bg-yolk shadow-box-yolk ring-3 ring-yolk" : "bg-white hover:-translate-y-0.5"
                  }`}
                >
                  <span className={`inline-block rounded-full px-3 py-0.5 text-sm font-bold ${active ? "bg-crust text-yolk" : "bg-yolk-soft"}`}>{s.label}</span>
                  <span className="mt-3 block font-display text-4xl font-extrabold leading-none">
                    {rupees(s.dailySales)}
                    <span className="ml-1 font-body text-base font-semibold text-crust-soft">/ day</span>
                  </span>
                  <span className="mt-4 flex justify-between border-t-2 border-crust/15 pt-3">
                    <span className="text-crust-soft">Turnover / month</span>
                    <span className="font-bold tabular-nums">{rupees(r.turnover)}</span>
                  </span>
                  <span className="mt-1 flex justify-between">
                    <span className="text-crust-soft">Profit / month</span>
                    <span className="font-bold tabular-nums">{rupees(r.profit)}</span>
                  </span>
                  <span className="mt-4 block text-sm font-bold text-ketchup-deep">{active ? "In the calculator" : "Try these numbers →"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_25rem] lg:gap-12">
        <div className="box-flat bg-white p-6 text-crust shadow-box-yolk sm:p-8">
          <label htmlFor={`${id}-daily`} className="block font-display text-2xl font-extrabold">
            Average sale per day
          </label>
          <p className="text-crust-soft">Everything else follows from this.</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative w-44 shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold">₹</span>
              <input id={`${id}-daily`} type="number" inputMode="numeric" min={0} step={500} value={daily} onChange={(e) => setDaily(num(e.target.value))} className={`${field} pl-7`} />
            </div>
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={500}
              value={Math.min(daily, sliderMax)}
              onChange={(e) => setDaily(num(e.target.value))}
              aria-label="Average sale per day"
              aria-valuetext={rupees(daily)}
              className="h-2 w-full cursor-pointer accent-[#d7261e]"
            />
          </div>

          {config.fixedCosts.length > 0 && (
            <fieldset className="mt-9">
              <legend className="mb-3 inline-block rounded-full bg-crust px-3 py-0.5 text-sm font-bold text-yolk">Fixed costs per month</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {config.fixedCosts.map((c, i) => (
                  <div key={i}>
                    <label htmlFor={`${id}-f${i}`} className="mb-1 block font-semibold">
                      {c.label}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold">₹</span>
                      <input id={`${id}-f${i}`} type="number" inputMode="numeric" min={0} step={500} value={fixed[i]} onChange={(e) => setFixed(fixed.map((v, n) => (n === i ? num(e.target.value) : v)))} className={`${field} pl-7`} />
                    </div>
                    {c.note && <p className="mt-1 text-sm text-crust-soft">{c.note}</p>}
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {config.variableCosts.length > 0 && (
            <fieldset className="mt-9">
              <legend className="mb-1 inline-block rounded-full bg-crust px-3 py-0.5 text-sm font-bold text-yolk">Running costs</legend>
              <p className="mb-3 text-crust-soft">A share of sales, so they move with your turnover.</p>
              <ul className="space-y-2">
                {config.variableCosts.map((c, i) => (
                  <li key={i} className="grid grid-cols-[1fr_6.5rem] items-center gap-x-4 gap-y-1 rounded-xl bg-batter px-3 py-2.5 sm:grid-cols-[1fr_6.5rem_7.5rem]">
                    <label htmlFor={`${id}-v${i}`} className="font-semibold">
                      {c.label}
                      {c.note && <span className="block text-sm font-normal text-crust-soft">{c.note}</span>}
                    </label>
                    <div className="relative">
                      <input id={`${id}-v${i}`} type="number" inputMode="decimal" min={0} max={100} step={0.5} value={pct[i]} onChange={(e) => setPct(pct.map((v, n) => (n === i ? Math.min(100, num(e.target.value)) : v)))} className={`${field} pr-7`} aria-describedby={`${id}-v${i}-amt`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold">%</span>
                    </div>
                    <span id={`${id}-v${i}-amt`} className="col-span-2 text-right font-semibold tabular-nums sm:col-span-1">
                      {rupees(f.variableLines[i])}
                      <span className="text-sm font-normal text-crust-soft"> / mo</span>
                    </span>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          <button type="button" onClick={reset} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-control border-2 border-crust px-4 font-bold hover:bg-yolk">
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset to our figures
          </button>
        </div>

        <div className="lg:sticky lg:top-32">
          <div className="box relative bg-yolk p-7 pt-10 text-crust" aria-live="polite">
            <p className="sticker absolute -top-7 right-5 size-[4.5rem] rotate-12 bg-ketchup text-[0.8rem] text-white">{f.margin}% margin</p>
            <p className="font-bold">Net profit per month</p>
            <p className={`mt-1 font-display text-[clamp(2.75rem,2rem+2.5vw,3.9rem)] font-extrabold leading-none tabular-nums ${f.profit < 0 ? "text-ketchup-deep" : ""}`}>{rupees(f.profit)}</p>
            <div className="mt-6 flex h-5 overflow-hidden rounded-full border-3 border-crust bg-ketchup" role="img" aria-label={`${Math.round(profitShare)}% of turnover is profit`}>
              <div className="border-r-3 border-crust bg-white transition-[width]" style={{ width: `${profitShare}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-sm font-semibold">
              <span>■ Profit (white)</span>
              <span>Expenses (red) ■</span>
            </p>
            <dl className="mt-6 divide-y-2 divide-crust/15 rounded-xl bg-white px-4">
              {[
                ["Monthly turnover", rupees(f.turnover)],
                ["Total expense / month", rupees(f.expense)],
                ["Net profit / year", rupees(f.yearlyProfit)],
                ["Yearly turnover", rupees(f.yearlyTurnover)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-crust-soft">{k}</dt>
                  <dd className="font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            {config.investment > 0 && (
              <p className="mt-5 text-lg font-semibold leading-snug">
                {f.paybackMonths ? (
                  <>
                    Pays back the {rupees(config.investment)} investment in about{" "}
                    <span className="rounded-md bg-white px-1.5 font-display font-extrabold">
                      {f.paybackMonths} month{f.paybackMonths === 1 ? "" : "s"}
                    </span>
                    .
                  </>
                ) : (
                  "At these numbers the outlet does not yet cover its costs."
                )}
              </p>
            )}
          </div>
          {config.disclaimer && <p className="mt-6 text-sm opacity-80">{config.disclaimer}</p>}
        </div>
      </div>
    </div>
  );
}
