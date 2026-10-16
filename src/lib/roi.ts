export type FixedCost = { label: string; amount: number };
export type VariableCost = { label: string; percent: number };

export type RoiInput = {
  dailySales: number;
  daysPerMonth: number;
  investment: number;
  fixed: FixedCost[];
  variable: VariableCost[];
};

export function forecast({ dailySales, daysPerMonth, investment, fixed, variable }: RoiInput) {
  const turnover = Math.max(0, dailySales) * daysPerMonth;
  const fixedTotal = fixed.reduce((s, c) => s + (c.amount || 0), 0);
  const variableLines = variable.map((c) => Math.round((turnover * (c.percent || 0)) / 100));
  const expense = fixedTotal + variableLines.reduce((s, v) => s + v, 0);
  const profit = turnover - expense;
  return {
    turnover,
    expense,
    profit,
    variableLines,
    margin: turnover > 0 ? Math.round((profit / turnover) * 100) : 0,
    // null = never pays back at these numbers
    paybackMonths: profit > 0 && investment > 0 ? Math.ceil(investment / profit) : null,
    yearlyTurnover: turnover * 12,
    yearlyProfit: profit * 12,
  };
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const rupees = (n: number) => `${n < 0 ? "−" : ""}₹${inr.format(Math.abs(n))}`;
