import { describe, expect, it } from "vitest";
import { forecast, rupees } from "@/lib/roi";

describe("forecast", () => {
  const base = {
    daysPerMonth: 30,
    investment: 410000,
    fixed: [{ label: "Rent", amount: 25000 }, { label: "Salary", amount: 30000 }],
    variable: [{ label: "Raw materials", percent: 20 }, { label: "Electricity", percent: 5 }, { label: "Maintenance", percent: 2 }, { label: "Marketing", percent: 2 }],
  };

  it("matches the reference worked example", () => {
    const f = forecast({ ...base, dailySales: 10000 });
    expect(f.turnover).toBe(300000);
    expect(f.variableLines).toEqual([60000, 15000, 6000, 6000]);
    expect(f.expense).toBe(142000);
    expect(f.profit).toBe(158000);
    expect(f.margin).toBe(53);
    expect(f.paybackMonths).toBe(3);
    expect(f.yearlyProfit).toBe(1896000);
  });

  it("reports no payback when running at a loss", () => {
    const f = forecast({ ...base, dailySales: 500 });
    expect(f.profit).toBeLessThan(0);
    expect(f.paybackMonths).toBeNull();
    expect(rupees(-1500)).toBe("−₹1,500");
  });
});
