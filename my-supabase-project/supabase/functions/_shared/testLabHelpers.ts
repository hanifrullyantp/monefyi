/** Reset + apply + verify helpers for admin test lab. */

export const RESET_TABLES = [
  "transaction_impact_logs",
  "journal_entries",
  "transactions",
  "neraca_assets",
  "neraca_debts",
  "neraca_receivables",
  "neraca_equity_events",
  "neraca_chart_accounts",
  "balance_snapshots",
  "financial_goals",
  "financial_targets",
  "budgets",
  "email_imports",
  "weekly_digests",
  "user_notifications",
  "user_offer_interactions",
  "user_habits",
  "insights_generated",
  "debts",
  "recurring_transactions",
  "monthly_periods",
  "household_members",
  "suspense_log",
];

export async function assertTestUser(sb: any, userId: string) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, is_test_user, email")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.is_test_user) throw new Error("Target is not a test user");
  return data;
}

export async function resetTestUserData(sb: any, userId: string) {
  for (const table of RESET_TABLES) {
    try {
      await sb.from(table).delete().eq("user_id", userId);
    } catch {
      /* table may not exist */
    }
  }
  await sb.from("user_preferences").upsert({
    user_id: userId,
    financial_problems: [],
    payday_day: null,
    fixed_bills: {},
    monthly_income: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

export async function applyScenarioBundle(sb: any, userId: string, bundle: any) {
  const now = new Date().toISOString();
  await resetTestUserData(sb, userId);

  const prefs = bundle.userPreferences || {};
  await sb.from("user_preferences").upsert({
    user_id: userId,
    ...prefs,
    updated_at: now,
  }, { onConflict: "user_id" });

  const budgets = bundle.budgetsByMonth || {};
  for (const [month, b] of Object.entries(budgets)) {
    await sb.from("budgets").upsert({
      user_id: userId,
      month,
      income: (b as any).income,
      categories: (b as any).categories,
      updated_at: now,
    }, { onConflict: "user_id,month" });
  }

  const txs = (bundle.transactions || []).map((tx: any) => ({
    ...tx,
    user_id: userId,
    period: String(tx.date || "").slice(0, 7),
    currency: tx.currency || "IDR",
    created_at: now,
    updated_at: now,
  }));

  const CHUNK = 100;
  for (let i = 0; i < txs.length; i += CHUNK) {
    const { error } = await sb.from("transactions").insert(txs.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  for (const g of bundle.goals || []) {
    await sb.from("financial_goals").upsert({
      ...g,
      user_id: userId,
      updated_at: now,
    }, { onConflict: "id" });
  }

  for (const a of bundle.neraca?.assets || []) {
    await sb.from("neraca_assets").upsert({
      ...a,
      user_id: userId,
      updated_at: now,
    }, { onConflict: "id" });
  }

  for (const d of bundle.neraca?.debts || []) {
    await sb.from("neraca_debts").upsert({
      ...d,
      user_id: userId,
      updated_at: now,
    }, { onConflict: "id" });
  }

  for (const p of bundle.monthlyPeriods || []) {
    await sb.from("monthly_periods").upsert({
      user_id: userId,
      period: p.period,
      opening_balance: p.opening_balance,
      total_income: p.total_income,
      total_expense: p.total_expense,
      closing_balance: p.closing_balance,
      status: p.status,
      closed_at: p.status === "closed" ? now : null,
      updated_at: now,
    }, { onConflict: "user_id,period" });
  }

  await sb.from("profiles").update({
    test_scenario_label: bundle.presetKey || "custom",
    updated_at: now,
  }).eq("id", userId);
}

/** Minimal consumption metrics (matches verify-accuracy-test.cjs). */
export function computeConsumptionMetrics(transactions: any[]) {
  let income = 0;
  let consumption = 0;
  let totalExpense = 0;
  let transfer = 0;

  for (const tx of transactions) {
    const status = tx.status || tx.meta?.status;
    if (status !== "confirmed" && status !== undefined && status !== null) continue;
    const cat = String(tx.category || "").toLowerCase();
    if (cat === "menunggu proses" || cat === "draft") continue;

    const amt = Math.abs(Number(tx.amount || 0));
    const type = String(tx.type || "").toLowerCase();
    const treatment = tx.meta?.expense_treatment;

    if (type === "income") {
      income += amt;
      continue;
    }
    if (type !== "expense" && type !== "pengeluaran" && type !== "out") continue;

    totalExpense += amt;
    if (treatment === "asset" || tx.meta?.is_asset_purchase) continue;
    if (treatment === "transfer") {
      transfer += amt;
      continue;
    }
    consumption += amt;
  }

  return {
    income,
    consumptionExpense: consumption,
    totalExpense,
    transfer,
    netCashFlow: income - totalExpense,
    consumptionNet: income - consumption,
  };
}

export function runVerificationChecks(transactions: any[], expected: any) {
  const rows: any[] = [];
  let pass = 0;
  let fail = 0;

  function row(label: string, expectedVal: any, actualVal: any) {
    const ok = expectedVal === "—" || expectedVal == null
      ? true
      : String(expectedVal) === String(actualVal);
    if (ok) pass += 1;
    else fail += 1;
    rows.push({ label, expected: expectedVal, actual: actualVal, pass: ok });
  }

  const months = expected?.months || {};
  for (const [month, exp] of Object.entries(months)) {
    const monthTxs = transactions.filter((t) => String(t.date || "").startsWith(month));
    const m = computeConsumptionMetrics(monthTxs);
    const e = exp as any;
    if (e.income != null) row(`${month} income`, e.income, m.income);
    if (e.consumptionExpense != null) row(`${month} consumption`, e.consumptionExpense, m.consumptionExpense);
    if (e.netCashFlow != null) row(`${month} total net`, e.netCashFlow, m.netCashFlow);
  }

  const trend = expected?.trend;
  if (trend?.nonSavingExpense && trend?.labels) {
    const actual = trend.labels.map((month: string) => {
      const monthTxs = transactions.filter((t) => String(t.date || "").startsWith(month));
      return computeConsumptionMetrics(monthTxs).consumptionExpense;
    });
    const ok = JSON.stringify(actual) === JSON.stringify(trend.nonSavingExpense);
    if (ok) pass += 1;
    else fail += 1;
    rows.push({
      label: "Trend May–Jul",
      expected: trend.nonSavingExpense.join(", "),
      actual: actual.join(", "),
      pass: ok,
    });
  }

  const pendingHp = transactions.filter((t) => t.status === "pending" || t.meta?.status === "pending");
  row("Aug pending count", 1, pendingHp.length);

  return { rows, pass, fail, total: pass + fail };
}

/** Generate scenario bundle from config (Deno port of shared generator). */
export function generateScenarioFromConfig(config: any) {
  if (config.empty === true) {
    return {
      transactions: [],
      budgetsByMonth: {},
      userPreferences: { payday_day: 25, monthly_income: null },
      goals: [],
      neraca: { assets: [], debts: [] },
      monthlyPeriods: [],
      defaultMonth: config.defaultMonth || "2026-08",
      presetKey: config.presetKey || "empty-state",
    };
  }

  let txCounter = 0;
  const mkTx = (partial: any) => {
    txCounter += 1;
    return {
      id: partial.id || `acc-tx-${partial.date}-${txCounter}`,
      type: partial.type || "expense",
      currency: "IDR",
      status: partial.status || "confirmed",
      confirmed_at: partial.status === "pending" ? null : `${partial.date}T12:00:00.000Z`,
      meta: partial.meta || { source: "test-scenario" },
      payment_method: partial.account || "BCA",
      ...partial,
    };
  };

  const monthlyIncome = Number(config.monthlyIncome || 8000000);
  const paydayDay = Number(config.paydayDay || 25);
  const months: string[] = config.months || ["2026-08"];
  const scale = monthlyIncome / 8000000;
  const expenseMult = Number(config.expenseMultiplier || 1);

  const ACCURACY_AUG = {
    Kost: 1200000, Listrik: 165000, Internet: 150000, "Cicilan HP": 250000,
    "Makan Sehari-hari": 650000, Transportasi: 305000, "Belanja Kebutuhan": 235000,
    Kesehatan: 45000, "Nongkrong & Kopi": 155000, Hiburan: 240000,
  };

  const transactions: any[] = [];
  const budgetsByMonth: Record<string, any> = {};

  for (const month of months) {
    const totals: Record<string, number> = {};
    for (const [k, v] of Object.entries(ACCURACY_AUG)) {
      totals[k] = Math.round(Number(v) * scale * expenseMult);
    }
    const addIncome = config.incomeEveryMonth === true
      || months.length === 1
      || month !== months[months.length - 1];
    if (addIncome && monthlyIncome > 0) {
      transactions.push(mkTx({
        id: `acc-tx-${month}-income`,
        date: `${month}-${String(paydayDay).padStart(2, "0")}`,
        type: "income",
        amount: monthlyIncome,
        category: "Gaji",
        merchant: "Gaji Bulanan",
        account: "BCA",
      }));
    }
    for (const [cat, amount] of Object.entries(totals)) {
      transactions.push(mkTx({
        date: `${month}-05`,
        amount,
        category: cat,
        merchant: cat,
        account: "BCA",
        meta: { expense_treatment: "consumption" },
      }));
    }
    budgetsByMonth[month] = {
      month,
      income: monthlyIncome,
      categories: { rows: [{ id: "bdg-kost", name: "Kost", amount: Math.round(1200000 * scale), priority: "harus" }] },
    };
  }

  if (config.includeHpAnomaly !== false && months.includes("2026-08")) {
    transactions.push(mkTx({
      id: "acc-tx-2026-08-hp-001",
      date: "2026-08-04",
      amount: Number(config.hpAmount || 7988000),
      category: "Elektronik",
      merchant: "Beli HP",
      account: "BCA",
      status: "pending",
      meta: { needs_classification: true, status: "pending", source: "test-scenario" },
    }));
  }

  const goals = config.includeGoals ? [
    { id: "test-goal-darurat", name: "Dana Darurat", icon: "💰", color: "#10B981", target_amount: 30000000, current_amount: 5000000, priority: 1, status: "active", is_primary: true, monthly_contribution: 800000 },
    { id: "test-goal-laptop", name: "Laptop Baru", icon: "💻", color: "#2563EB", target_amount: 15000000, current_amount: 2000000, priority: 2, status: "active", is_primary: false, monthly_contribution: 500000 },
    { id: "test-goal-travel", name: "Liburan", icon: "✈️", color: "#F59E0B", target_amount: 8000000, current_amount: 1500000, priority: 3, status: "active", is_primary: false, monthly_contribution: 300000 },
    { id: "test-goal-house", name: "DP Rumah", icon: "🏠", color: "#8B5CF6", target_amount: 100000000, current_amount: 12000000, priority: 1, status: "active", is_primary: false, monthly_contribution: 1000000 },
  ] : [];

  const debts = config.includeDebts ? [
    { id: "test-debt-hp", category: "hutang_lainnya", name: "Cicilan HP", amount: 4500000, notes: "Sisa cicilan HP" },
    { id: "test-debt-cc", category: "hutang_lainnya", name: "Kartu Kredit", amount: 3200000, notes: "Tagihan CC" },
    { id: "test-debt-kpr", category: "kewajiban_lainnya", name: "KPR Ringan", amount: 85000000, notes: "Cicilan rumah" },
  ] : [];

  return {
    transactions,
    budgetsByMonth,
    userPreferences: {
      payday_day: paydayDay,
      monthly_income: monthlyIncome,
      income_source: "salary_fixed",
    },
    goals,
    neraca: { assets: [], debts },
    monthlyPeriods: [],
    defaultMonth: config.defaultMonth || months[months.length - 1],
    presetKey: config.presetKey || "custom",
  };
}

/** Load full accuracy preset from bundled fixture path. */
export async function loadAccuracyPreset(): Promise<any> {
  const base = new URL("../_shared/fixtures/accuracy-test-4month/", import.meta.url);
  const read = async (name: string) => JSON.parse(await Deno.readTextFile(new URL(name, base)));
  const txs = await read("transactions-all.json");
  const prefs = await read("user-preferences.json");
  const goals = await read("financial-goals.json");
  const neraca = await read("neraca-opening.json");
  const periods = await read("monthly-periods.json");
  const expected = await read("expected-values.json");
  const months = ["2026-05", "2026-06", "2026-07", "2026-08"];
  const budgetsByMonth: Record<string, any> = {};
  for (const m of months) {
    budgetsByMonth[m] = await read(`budgets-${m}.json`);
    budgetsByMonth[m].month = m;
  }
  return {
    transactions: txs,
    budgetsByMonth,
    userPreferences: prefs,
    goals,
    neraca,
    monthlyPeriods: periods,
    expectedValues: expected,
    defaultMonth: "2026-08",
    presetKey: "accuracy-4month",
  };
}

export async function loadDemoAugustPreset(): Promise<any> {
  const base = new URL("../_shared/fixtures/demo-august-2026/", import.meta.url);
  const read = async (name: string) => JSON.parse(await Deno.readTextFile(new URL(name, base)));
  const txs = await read("transactions.json");
  const budget = await read("budget-2026-08.json");
  const prefs = await read("user-preferences.json");
  return {
    transactions: txs,
    budgetsByMonth: { "2026-08": { ...budget, month: "2026-08" } },
    userPreferences: prefs,
    goals: [],
    neraca: { assets: [], debts: [] },
    monthlyPeriods: [],
    defaultMonth: "2026-08",
    presetKey: "demo-august",
  };
}

export async function resolveScenarioBundle(sb: any, body: any) {
  if (body.scenario_bundle) return body.scenario_bundle;
  const presetKey = body.preset_key || body.presetKey;

  if (presetKey === "accuracy-4month") {
    try {
      return await loadAccuracyPreset();
    } catch {
      return generateScenarioFromConfig({
        presetKey: "accuracy-4month",
        monthlyIncome: 8000000,
        months: ["2026-05", "2026-06", "2026-07", "2026-08"],
        includeHpAnomaly: true,
      });
    }
  }

  if (presetKey === "demo-august") {
    try {
      return await loadDemoAugustPreset();
    } catch {
      return generateScenarioFromConfig({
        presetKey: "demo-august",
        monthlyIncome: 5000000,
        months: ["2026-08"],
        includeHpAnomaly: false,
      });
    }
  }

  if (presetKey) {
    const { data: presetRow } = await sb
      .from("test_scenarios")
      .select("*")
      .eq("kind", "preset")
      .eq("preset_key", presetKey)
      .maybeSingle();
    if (presetRow?.config) {
      return generateScenarioFromConfig({
        ...presetRow.config,
        presetKey: presetRow.preset_key || presetKey,
        defaultMonth: presetRow.default_month || presetRow.config.defaultMonth,
      });
    }
  }

  if (body.config) return generateScenarioFromConfig(body.config);

  const { data } = await sb.from("test_scenarios").select("*").eq("id", body.scenario_id).maybeSingle();
  if (data?.config) {
    return generateScenarioFromConfig({
      ...data.config,
      presetKey: data.preset_key || "custom",
      defaultMonth: data.default_month || data.config.defaultMonth,
    });
  }

  throw new Error("scenario_id, preset_key, or config required");
}
