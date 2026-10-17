"use client";

import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { forecast, rupees } from "@/lib/roi";

type Scenario = { label: string; subtitle?: string; dailySales: number; salary: number; rent: number; electricity: number; royalty: number };
type Pct = { label: string; percent: number; note?: string };
export type RoiConfig = {
  investment: number;
  daysPerMonth: number;
  defaultScenario?: number;
  scenarios: Scenario[];
  variableCosts: Pct[];
  disclaimer?: string;
};

const FIXED = [
  ["salary", "Staff salary"],
  ["rent", "Rent"],
  ["electricity", "Electricity bill"],
  ["royalty", "Royalty"],
] as const;
type FixedKey = (typeof FIXED)[number][0];
type Fixed = Record<FixedKey, number>;

const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0));
const pick = (s: Scenario): Fixed => ({ salary: s.salary || 0, rent: s.rent || 0, electricity: s.electricity || 0, royalty: s.royalty || 0 });
const field =
  "w-full rounded-control border-2 border-crust bg-batter px-3 py-2 text-right text-lg font-semibold tabular-nums text-crust focus:bg-white focus:outline-none focus-visible:outline-3 focus-visible:outline-ketchup";
const legend = "mb-3 inline-block rounded-full bg-crust px-3 py-0.5 text-sm font-bold text-yolk";

function run(config: RoiConfig, daily: number, fixed: Fixed, pct: number[]) {
  return forecast({
    dailySales: daily,
    daysPerMonth: config.daysPerMonth,
    investment: config.investment,
    fixed: FIXED.map(([k, label]) => ({ label, amount: fixed[k] })),
    variable: config.variableCosts.map((c, i) => ({ label: c.label, percent: pct[i] })),
  });
}

// The brochure's projection table: one column per scenario, as given (not edited).
function Projections({ config, active, onPick }: { config: RoiConfig; active: number; onPick: (i: number) => void }) {
  const base = config.variableCosts.map((c) => c.percent);
  const cols = config.scenarios.map((s) => ({ s, f: run(config, s.dailySales, pick(s), base) }));
  const money = (n: number) => new Intl.NumberFormat("en-IN").format(n);
  const showElectricity = config.scenarios.some((s) => s.electricity > 0);
  const rows: [string, (c: (typeof cols)[number]) => string, boolean?][] = [
    ["Expected sales per day", (c) => money(c.s.dailySales)],
    ["Monthly turnover", (c) => money(c.f.turnover)],
    ...config.variableCosts.map((v, i) => [`${v.label} (${v.percent}%)`, (c: (typeof cols)[number]) => money(c.f.variableLines[i])] as [string, (c: (typeof cols)[number]) => string]),
    ["Staff salary", (c) => money(c.s.salary)],
    ["Rent", (c) => money(c.s.rent)],
    ...(showElectricity ? [["Electricity bill", (c: (typeof cols)[number]) => money(c.s.electricity)] as [string, (c: (typeof cols)[number]) => string]] : []),
    ["Royalty", (c) => (c.s.royalty ? money(c.s.royalty) : "Nil")],
    ["Total expenses per month", (c) => money(c.f.expense)],
    ["Total profit per month", (c) => money(c.f.profit), true],
  ];
  const pickBtn = (i: number) => (
    <button type="button" onClick={() => onPick(i)} aria-pressed={active === i} className={`mt-2 font-display text-xs font-semibold underline underline-offset-4 ${active === i ? "text-yolk" : "text-batter/80 hover:text-yolk"}`}>
      {active === i ? "In the calculator" : "Use in calculator"}
    </button>
  );
  return (
    <div className="mb-12">
      {/* Desktop and tablet: the brochure table. */}
      <div className="box hidden bg-crust p-4 shadow-box-yolk md:block md:p-6">
        <table className="w-full border-separate border-spacing-x-3 border-spacing-y-2 text-center">
          <thead>
            <tr>
              <th className="align-bottom">
                <span className="block rounded-md bg-batter px-3 py-1.5 text-left font-display text-sm font-extrabold uppercase text-crust">Particulars</span>
              </th>
              {cols.map(({ s }, i) => (
                <th key={i} className="align-bottom font-normal">
                  {s.subtitle && <span className="mb-2 block text-sm text-batter/80">{s.subtitle}</span>}
                  <span className={`block rounded-md px-3 py-1.5 font-display text-sm font-extrabold uppercase ${active === i ? "bg-ketchup text-white" : "bg-yolk text-crust"}`}>{s.label}</span>
                  {pickBtn(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value, strong]) => (
              <tr key={label}>
                <th scope="row" className={`rounded-md bg-ketchup px-3 py-1.5 text-left font-display text-base text-white ${strong ? "font-extrabold" : "font-semibold"}`}>
                  {label}
                </th>
                {cols.map((c, i) => (
                  <td key={i} className={`rounded-md px-3 py-1.5 font-display text-lg tabular-nums ${strong ? "bg-yolk font-extrabold text-crust" : "bg-white font-semibold text-crust"}`}>
                    {value(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per projection. */}
      <div className="grid gap-4 md:hidden">
        {cols.map((c, i) => (
          <div key={i} className={`box p-4 ${active === i ? "bg-yolk text-crust" : "bg-white text-crust"}`}>
            <p className="font-display text-base font-bold uppercase">{c.s.label}</p>
            {c.s.subtitle && <p className="text-sm text-crust-soft">{c.s.subtitle}</p>}
            <dl className="mt-3 space-y-1.5">
              {rows.map(([label, value, strong]) => (
                <div key={label} className={`flex items-baseline justify-between gap-3 rounded-md px-3 py-1.5 ${strong ? "bg-crust font-extrabold text-yolk" : "bg-ketchup text-white"}`}>
                  <dt className="text-sm">{label}</dt>
                  <dd className="font-display tabular-nums">{value(c)}</dd>
                </div>
              ))}
            </dl>
            {pickBtn(i)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoiCalculator({ config }: { config: RoiConfig }) {
  const id = useId();
  const start = Math.min(Math.max((config.defaultScenario || 1) - 1, 0), Math.max(config.scenarios.length - 1, 0));
  const first = config.scenarios[start] ?? { label: "", dailySales: 0, salary: 0, rent: 0, electricity: 0, royalty: 0 };
  const [active, setActive] = useState(start);
  const [daily, setDaily] = useState(first.dailySales);
  const [fixed, setFixed] = useState<Fixed>(pick(first));
  const [pct, setPct] = useState(config.variableCosts.map((c) => c.percent));

  const choose = (i: number) => {
    const s = config.scenarios[i];
    setActive(i);
    setDaily(s.dailySales);
    setFixed(pick(s));
    setPct(config.variableCosts.map((c) => c.percent));
  };
  const f = run(config, daily, fixed, pct);
  const sliderMax = Math.max(20000, ...config.scenarios.map((s) => s.dailySales * 1.5), daily);
  const profitShare = f.turnover > 0 ? Math.min(100, Math.max(0, (f.profit / f.turnover) * 100)) : 0;

  return (
    <div>
      {config.scenarios.length > 0 && <Projections config={config} active={active} onPick={choose} />}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_26rem] lg:gap-8">
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

          <fieldset className="mt-9">
            <legend className={legend}>Monthly costs</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIXED.map(([k, label]) => (
                <div key={k}>
                  <label htmlFor={`${id}-${k}`} className="mb-1 block font-medium">
                    {label}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold">₹</span>
                    <input id={`${id}-${k}`} type="number" inputMode="numeric" min={0} step={500} value={fixed[k]} onChange={(e) => setFixed({ ...fixed, [k]: num(e.target.value) })} className={`${field} pl-7`} />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {config.variableCosts.length > 0 && (
            <fieldset className="mt-9">
              <legend className={legend}>Costs as a share of sales</legend>
              <ul className="space-y-2">
                {config.variableCosts.map((c, i) => (
                  <li key={i} className="grid grid-cols-[1fr_6.5rem] items-center gap-x-4 gap-y-1 rounded-xl bg-batter px-3 py-2.5 sm:grid-cols-[1fr_6.5rem_7.5rem]">
                    <label htmlFor={`${id}-v${i}`} className="font-medium">
                      {c.label}
                      {c.note && <span className="block text-sm font-normal text-crust-soft">{c.note}</span>}
                    </label>
                    <div className="relative">
                      <input id={`${id}-v${i}`} type="number" inputMode="decimal" min={0} max={100} step={0.5} value={pct[i]} onChange={(e) => setPct(pct.map((v, n) => (n === i ? Math.min(100, num(e.target.value)) : v)))} className={`${field} pr-8`} aria-describedby={`${id}-v${i}-amt`} />
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

          <button type="button" onClick={() => choose(active)} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-control border-2 border-crust px-4 font-bold hover:bg-yolk">
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset to {config.scenarios[active]?.label || "our figures"}
          </button>
        </div>

        <div className="lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <div className="box bg-yolk p-7 text-crust" aria-live="polite">
            <p className="text-center font-bold">Net profit per month</p>
            <p className={`mt-2 text-center font-display text-[clamp(2.6rem,2rem+2.4vw,3.8rem)] font-extrabold leading-none tabular-nums ${f.profit < 0 ? "text-ketchup-deep" : ""}`}>{rupees(f.profit)}</p>
            <div className="mt-6 flex h-5 overflow-hidden rounded-full border-3 border-crust bg-ketchup" role="img" aria-label={`${Math.round(profitShare)}% of turnover is profit`}>
              <div className="border-r-3 border-crust bg-white transition-[width]" style={{ width: `${profitShare}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-sm font-semibold">
              <span>
                <span className="mr-1.5 inline-block size-2.5 rounded-full border border-crust bg-white" aria-hidden="true" />
                Profit
              </span>
              <span>
                Expenses
                <span className="ml-1.5 inline-block size-2.5 rounded-full bg-ketchup" aria-hidden="true" />
              </span>
            </p>
            <dl className="mt-6 divide-y-2 divide-crust/15 rounded-xl bg-white px-4">
              {[
                ["Monthly turnover", rupees(f.turnover)],
                ["Total expense / month", rupees(f.expense)],
                ["Margin", `${f.margin}%`],
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
                    Recovers the {rupees(config.investment)} investment in about{" "}
                    <strong className="rounded-md bg-white px-1.5 font-display font-extrabold">
                      {f.paybackMonths} month{f.paybackMonths === 1 ? "" : "s"}
                    </strong>
                    .
                  </>
                ) : (
                  "At these numbers the outlet does not yet cover its costs."
                )}
              </p>
            )}
          </div>
          {config.disclaimer && <p className="mt-5 text-sm opacity-80">{config.disclaimer}</p>}
        </div>
      </div>
    </div>
  );
}
