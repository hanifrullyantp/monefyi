import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveGeminiForUser, recordGeminiUsage, callGeminiGenerate } from "../_shared/gemini.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const jsonHeaders = { "Content-Type": "application/json" };

type TxDirection = "expense" | "income";
type ParserFlag =
  | "date_mismatch"
  | "split_payment"
  | "split_sum_mismatch"
  | "split_incomplete"
  | "ai_resolved"
  | "low_confidence"
  | "unknown_account"
  | "project_tagged"
  | "payroll_detected";

type AccountSplit = {
  account_raw: string;
  account_resolved: string;
  amount: number;
  is_primary: boolean;
};

type QuantityInfo = {
  quantity: number;
  unit: string;
  unit_raw: string;
  unit_price: number;
  item_name: string;
};

type ParsedLine = {
  raw: string;
  nominal: number;
  description: string;
  direction: TxDirection;
  accounts: AccountSplit[];
  quantity?: QuantityInfo | null;
  project_tag?: string | null;
  confidence: number;
  flags: ParserFlag[];
};

type FinalTransaction = {
  id: string;
  date: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category_id: string;
  category_name: string;
  category_emoji: string;
  account_id: string;
  account_name: string;
  description: string;
  notes: string;
  project_tag?: string | null;
  quantity?: QuantityInfo | null;
  splits?: AccountSplit[];
  split_group_id?: string;
  split_index?: number;
  split_of?: number;
  split_total?: number;
  source: "parsed_batch";
  confidence: number;
  flags: ParserFlag[];
  needs_review: boolean;
};

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}
function normalizeText(t: string) {
  return String(t || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parseAmountFlexible(v: string | number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  let s = String(v ?? "").trim();
  if (!s) return 0;
  s = s.replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) s = `${parts[0]}.${parts[1]}`;
    else s = s.replace(/,/g, "");
  } else if (hasDot) {
    const parts = s.split(".");
    if (!(parts.length === 2 && parts[1].length <= 2)) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
function cleanAccountName(raw: string): string {
  const t = normalizeText(raw)
    .replace(/^uang\s+/i, "")
    .replace(/^kantong\s+utama\/?kas$/i, "kas utama")
    .replace(/^kantong\s+utama$/i, "kas utama")
    .trim();
  if (!t) return "Kas";
  return t
    .split(" ")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}
function levenshtein(a: string, b: string) {
  const s = normalizeText(a);
  const t = normalizeText(b);
  const m = s.length;
  const n = t.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
function normalizeDate(dayNameRaw: string, dd: number, mm: number, yyyy: number) {
  const d = new Date(yyyy, mm - 1, dd);
  const dayMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayName = String(dayNameRaw || "").replace("Jum'at", "Jumat");
  const actual = dayMap[d.getDay()];
  const flags: ParserFlag[] = [];
  if (dayName && dayName !== actual) flags.push("date_mismatch");
  return { date: toISODate(d), flags };
}
function stripWAMetadata(input: string) {
  const re = /^\[(\d{1,2}:\d{2}),\s*(\d{1,2}\/\d{1,2}\/\d{4})\]\s*([^:]+):\s*/m;
  const m = String(input || "").match(re);
  if (!m) return { wa_timestamp: null, sender: null, content: String(input || "").trim() };
  const wa_timestamp = `${m[2]} ${m[1]}`;
  return {
    wa_timestamp,
    sender: String(m[3] || "").trim(),
    content: String(input || "").replace(re, "").trim(),
  };
}
function splitDateBlocks(content: string) {
  const lines = String(content || "").split(/\r?\n/);
  const out: Array<{ date: string; day_name: string; raw_block: string; flags: ParserFlag[] }> = [];
  const dateRe = /^(Senin|Selasa|Rabu|Kamis|Jumat|Jum'at|Sabtu|Minggu)[,\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
  let current: { date: string; day_name: string; rows: string[]; flags: ParserFlag[] } | null = null;
  for (const line of lines) {
    const m = line.trim().match(dateRe);
    if (m) {
      if (current) out.push({ date: current.date, day_name: current.day_name, raw_block: current.rows.join("\n"), flags: current.flags });
      const n = normalizeDate(m[1], Number(m[2]), Number(m[3]), Number(m[4]));
      current = { date: n.date, day_name: m[1], rows: [], flags: n.flags };
      continue;
    }
    if (!current) continue;
    current.rows.push(line);
  }
  if (current) out.push({ date: current.date, day_name: current.day_name, raw_block: current.rows.join("\n"), flags: current.flags });
  return out;
}
function extractProjectTag(desc: string): string | null {
  const utk = desc.match(/\butk\s+([a-z0-9][\w\s-]{1,30})/i);
  if (utk?.[1]) return utk[1].trim();
  const cc = desc.match(/\bcc\s+([a-z][\w\s-]{1,30})/i);
  if (cc?.[1]) return cc[1].trim();
  return null;
}
function parseQuantity(description: string, nominal: number): QuantityInfo | null {
  const units: Record<string, string> = {
    kping: "keping",
    pcs: "pcs",
    btg: "batang",
    lbr: "lembar",
    m: "meter",
    kg: "kg",
    ken: "kaleng",
    kotak: "kotak",
    klg: "kaleng",
    ltr: "liter",
  };
  const p = new RegExp(`^(\\d+)\\s+(${Object.keys(units).join("|")})\\s+(.+)$`, "i");
  const m = String(description || "").trim().match(p);
  if (!m) return null;
  const q = Number(m[1] || 0);
  if (!q) return null;
  return {
    quantity: q,
    unit_raw: m[2],
    unit: units[m[2].toLowerCase()] || m[2],
    item_name: String(m[3] || "").trim(),
    unit_price: nominal / q,
  };
}
function parseAccountsFromParen(parenthetical: string, nominal: number) {
  const clean = String(parenthetical || "").trim();
  if (!clean) return { accounts: [{ account_raw: "kas", account_resolved: "Kas", amount: nominal, is_primary: true }], flags: [] as ParserFlag[] };
  const segs = clean.split(/\s+\+\s+/);
  const accounts: AccountSplit[] = [];
  const flags: ParserFlag[] = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i].trim();
    const m = s.match(/(\d[\d.,]*)\s+(.+)/);
    if (!m) {
      accounts.push({ account_raw: s, account_resolved: cleanAccountName(s), amount: i === 0 ? nominal : 0, is_primary: i === 0 });
      continue;
    }
    const amt = parseAmountFlexible(m[1]);
    accounts.push({ account_raw: m[2], account_resolved: cleanAccountName(m[2]), amount: amt, is_primary: i === 0 });
  }
  if (accounts.length > 1) flags.push("split_payment");
  const sum = accounts.reduce((a, b) => a + Number(b.amount || 0), 0);
  if (accounts.length > 1 && Math.abs(sum - nominal) > 1) flags.push("split_sum_mismatch");
  if (accounts.length === 1 && accounts[0].amount && Math.abs(accounts[0].amount - nominal) > 1) flags.push("split_incomplete");
  if (accounts.length === 1 && !accounts[0].amount) accounts[0].amount = nominal;
  return { accounts, flags };
}
function parseTransactionLine(rawLine: string, direction: TxDirection): ParsedLine | null {
  const line = String(rawLine || "").trim().replace(/^-+\s*/, "");
  if (!line) return null;
  const nominalM = line.match(/(\d[\d.,]*)/);
  const nominal = nominalM ? parseAmountFlexible(nominalM[1]) : 0;
  const paren = line.match(/\(([^)]+)\)\s*$/);
  const parenBody = paren?.[1] || "";
  const { accounts, flags } = parseAccountsFromParen(parenBody, nominal);
  let description = line;
  if (nominalM) description = description.replace(nominalM[1], "").trim();
  if (paren?.[0]) description = description.replace(paren[0], "").trim();
  const projectTag = extractProjectTag(description);
  if (projectTag) flags.push("project_tagged");
  const quantity = parseQuantity(description, nominal);
  let confidence = 0.92;
  if (!nominal) confidence -= 0.32;
  if (!description || description.split(" ").length < 2) confidence -= 0.18;
  if (flags.includes("split_sum_mismatch") || flags.includes("split_incomplete")) confidence -= 0.2;
  if (confidence < 0.85) flags.push("low_confidence");
  return { raw: rawLine, nominal, description, direction, accounts, quantity, project_tag: projectTag, confidence: Math.max(0.1, Math.min(0.99, confidence)), flags };
}
function parseBlock(raw_block: string, dateFlags: ParserFlag[]) {
  const lines = String(raw_block || "").split(/\r?\n/);
  let current: TxDirection = "expense";
  const parsed: ParsedLine[] = [];
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) continue;
    if (/^duit\s+keluar/i.test(t)) {
      current = "expense";
      continue;
    }
    if (/^duit\s+masuk/i.test(t)) {
      current = "income";
      continue;
    }
    if (!t.startsWith("-")) continue;
    const line = parseTransactionLine(t, current);
    if (!line) continue;
    line.flags.push(...dateFlags);
    parsed.push(line);
  }
  return parsed;
}

type CategoryResult = { id: string; name: string; emoji: string; confidence: number; type?: "income" | "expense" | "transfer"; payroll?: string };
function classifyCategory(desc: string, direction: TxDirection): CategoryResult {
  const t = normalizeText(desc);
  if (/gaji\s+\w+|upah|honor/.test(t)) {
    return { id: "cat_payroll", name: "Gaji & Upah", emoji: "👷", confidence: 0.98, payroll: t.match(/gaji\s+(\w+)/)?.[1] };
  }
  if (/^(tf|transfer|kirim uang)\b/.test(t)) {
    return { id: "cat_transfer", name: "Transfer", emoji: "🔄", confidence: 0.97, type: "transfer" };
  }
  const defs = [
    { id: "cat_material_bangunan", name: "Material Bangunan", emoji: "🧱", kws: ["besi", "hollow", "pipa", "triplek", "hpl", "acp", "alcotuff", "edging", "kawat las", "elektroda"] },
    { id: "cat_alat", name: "Alat & Hardware", emoji: "🔧", kws: ["mata bor", "gerinda", "amplas", "ring", "mur", "baut", "paku", "sekrup"] },
    { id: "cat_bahan_habis", name: "Bahan Habis Pakai", emoji: "🧪", kws: ["thinner", "cat", "epoxy", "primer", "oli", "platon", "belkote"] },
    { id: "cat_transportasi", name: "Transportasi", emoji: "🚚", kws: ["ojek", "pickup", "angkut", "ongkir", "ekspedisi"] },
    { id: "cat_utilitas", name: "Utilitas", emoji: "⚡", kws: ["listrik", "air", "internet", "telepon", "galon", "gas"] },
    { id: "cat_marketing", name: "Marketing & Konten", emoji: "📱", kws: ["konten", "marketing", "sosmed", "desain", "foto", "video"] },
    { id: "cat_pendapatan_proyek", name: "Pendapatan Proyek", emoji: "💼", kws: ["pelunasan", "dp", "bayaran", "pembayaran"], incomeOnly: true },
  ];
  let best: { cat: typeof defs[number]; score: number } | null = null;
  for (const cat of defs) {
    if (cat.incomeOnly && direction !== "income") continue;
    const score = cat.kws.reduce((acc, k) => (t.includes(k) ? acc + 1 : acc), 0);
    if (!score) continue;
    if (!best || score > best.score) best = { cat, score };
  }
  if (best) return { id: best.cat.id, name: best.cat.name, emoji: best.cat.emoji, confidence: Math.min(0.95, 0.82 + best.score * 0.06) };
  return { id: "cat_lainnya", name: direction === "income" ? "Pendapatan Lainnya" : "Lainnya", emoji: "🧾", confidence: 0.62 };
}
function resolveAccount(raw: string, userAccounts: string[], aliases: Record<string, string>) {
  const key = normalizeText(raw);
  const dict: Record<string, string> = { ...aliases };
  for (const a of userAccounts) dict[normalizeText(a)] = a;
  if (!dict["uang kas"] && userAccounts.length) dict["uang kas"] = userAccounts[0];
  if (!dict["kas"] && userAccounts.length) dict["kas"] = userAccounts[0];
  if (!dict["kantong utama/kas"] && userAccounts.length) dict["kantong utama/kas"] = userAccounts[0];
  const exact = dict[key];
  if (exact) return { accountName: exact, unknown: false };
  let fuzzy: string | null = null;
  let fuzzyDist = 99;
  for (const candidate of userAccounts) {
    const d = levenshtein(key, normalizeText(candidate));
    if (d < fuzzyDist) {
      fuzzyDist = d;
      fuzzy = candidate;
    }
  }
  if (fuzzy && fuzzyDist <= 2) return { accountName: fuzzy, unknown: false };
  const fallback = cleanAccountName(raw);
  return { accountName: fallback, unknown: true };
}
async function parseViaGeminiText(apiKey: string, text: string, accounts: string[]) {
  const prompt = `Parse this Indonesian personal finance transaction into JSON only:
{"date":"YYYY-MM-DD","type":"expense|income|transfer","amount":number,"currency":"IDR","category":"string","merchant":"string","payment_method":"string","account":"string","notes":"string","confidence":0.0-1.0}
Known accounts: ${accounts.join(", ")}
Today reference: ${toISODate(new Date())}
Text: ${text}`;
  const raw = await callGeminiGenerate(apiKey, "Return JSON only.", prompt, "gemini-2.0-flash");
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

async function parseViaGeminiBatch(
  apiKey: string,
  unresolved: Array<{ i: number; description: string; nominal: number; direction: TxDirection; project_tag?: string | null }>,
  accounts: string[],
) {
  const prompt = `Klasifikasikan transaksi ambigu ke kategori JSON array.
Format wajib:
[{"i":number,"category_id":"string","category_name":"string","category_emoji":"string","confidence":0.0}]
Known accounts: ${accounts.join(", ")}
Items:
${JSON.stringify(unresolved)}
`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 800, response_mime_type: "application/json" },
    }),
  });
  const raw = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Gemini parse error ${res.status}: ${raw.slice(0, 240)}`);
  const obj = JSON.parse(raw);
  const txt = obj?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const arr = JSON.parse(String(txt));
  return Array.isArray(arr) ? arr : [];
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, ...jsonHeaders } });
  }
  try {
    const SUPABASE_URL = pickEnv("SUPABASE_URL");
    const SUPABASE_ANON_KEY = pickEnv("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") || "";
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, ...jsonHeaders } });
    }
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, ...jsonHeaders } });

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    const mode = String(body?.mode || "text");
    if (!text) return new Response(JSON.stringify({ error: "text is required" }), { status: 400, headers: { ...corsHeaders, ...jsonHeaders } });

    const { data: profile } = await supa.from("profiles").select("gemini_key,settings").eq("id", userData.user.id).maybeSingle();
    const SERVICE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = SERVICE_KEY
      ? createClient(SUPABASE_URL, SERVICE_KEY)
      : supa;
    const geminiResolved = await resolveGeminiForUser(adminClient, userData.user.id);
    const geminiKey = geminiResolved.apiKey || String((profile as { gemini_key?: string })?.gemini_key || "").trim();
    const settings = (profile?.settings && typeof profile.settings === "object") ? profile.settings as Record<string, unknown> : {};
    const learning = (settings.batch_parser_learning && typeof settings.batch_parser_learning === "object")
      ? settings.batch_parser_learning as Record<string, unknown>
      : {};
    const accountAliases = (learning.account_aliases && typeof learning.account_aliases === "object")
      ? learning.account_aliases as Record<string, string>
      : {};
    const descPatterns = (learning.description_patterns && typeof learning.description_patterns === "object")
      ? learning.description_patterns as Record<string, { id: string; name: string; emoji: string }>
      : {};
    const knownProjects = (Array.isArray(learning.project_registry) ? learning.project_registry : []) as string[];
    const userAccounts = Array.isArray((settings as Record<string, unknown>).accounts)
      ? ((settings as Record<string, unknown>).accounts as string[])
      : ["Kas"];

    // Single-transaction modes (text, receipt) — never WhatsApp batch
    if (mode === "text" || mode === "receipt") {
      if (geminiKey) {
        try {
          const ai = await parseViaGeminiText(geminiKey, text, userAccounts);
          if (SERVICE_KEY && geminiResolved.source !== "none") {
            await recordGeminiUsage(adminClient, userData.user.id, geminiResolved.usageDate, geminiResolved.source, {
              requests_count: geminiResolved.userDailyUsed,
              platform_fallback_count: geminiResolved.platformFallbackUsed,
            });
          }
          return new Response(JSON.stringify({
            date: ai.date || toISODate(new Date()),
            type: ai.type === "transfer" ? "expense" : (ai.type || "expense"),
            amount: Number(ai.amount || 0),
            currency: "IDR",
            category: ai.category || "Lainnya",
            merchant: ai.merchant || "",
            payment_method: ai.payment_method || ai.account || "Cash",
            account: ai.account || ai.payment_method || "Cash",
            notes: ai.notes || text,
            confidence: Number(ai.confidence || 0.88),
          }), { status: 200, headers: { ...corsHeaders, ...jsonHeaders } });
        } catch (e) {
          console.warn("Gemini text parse fallback:", (e as Error).message);
        }
      }
      const pseudo = parseTransactionLine(`- ${text.replace(/\n/g, " ").trim()}`, "expense");
      if (!pseudo) {
        return new Response(JSON.stringify({ error: "unable to parse" }), { status: 400, headers: { ...corsHeaders, ...jsonHeaders } });
      }
      const cat = classifyCategory(pseudo.description, pseudo.direction);
      const firstAcc = resolveAccount(pseudo.accounts[0]?.account_raw || "Kas", userAccounts, accountAliases);
      return new Response(JSON.stringify({
        date: toISODate(new Date()),
        type: cat.type || pseudo.direction,
        amount: pseudo.nominal || 0,
        currency: "IDR",
        category: cat.name || "Lainnya",
        merchant: pseudo.description.slice(0, 42),
        payment_method: firstAcc.accountName,
        account: firstAcc.accountName,
        notes: text,
        confidence: 0.72,
      }), { status: 200, headers: { ...corsHeaders, ...jsonHeaders } });
    }

    const wa = stripWAMetadata(text);
    const blocks = splitDateBlocks(wa.content);
    if (!blocks.length) {
      const pseudo = parseTransactionLine(`- ${text}`, "expense");
      if (!pseudo) return new Response(JSON.stringify({ error: "unable to parse" }), { status: 400, headers: { ...corsHeaders, ...jsonHeaders } });
      const cat = classifyCategory(pseudo.description, pseudo.direction);
      const firstAcc = resolveAccount(pseudo.accounts[0]?.account_raw || "Kas", userAccounts, accountAliases);
      const single = {
        date: toISODate(new Date()),
        type: cat.type || pseudo.direction,
        amount: pseudo.nominal || 0,
        currency: "IDR",
        category: cat.name || "Lainnya",
        merchant: pseudo.description.slice(0, 42),
        payment_method: firstAcc.accountName,
        account: firstAcc.accountName,
        notes: text,
      };
      return new Response(JSON.stringify(single), { status: 200, headers: { ...corsHeaders, ...jsonHeaders } });
    }

    const finals: FinalTransaction[] = [];
    const unresolved: Array<{ i: number; description: string; nominal: number; direction: TxDirection; project_tag?: string | null }> = [];
    const projectsCount = new Map<string, { count: number; income: number; expense: number }>();
    let splitCount = 0;
    for (const block of blocks) {
      const lines = parseBlock(block.raw_block, block.flags);
      for (const parsed of lines) {
        const learned = descPatterns[normalizeText(parsed.description)];
        const cat = learned || classifyCategory(parsed.description, parsed.direction);
        let confidence = Math.min(parsed.confidence, Number((cat as { confidence?: number }).confidence || 0.8));
        if (parsed.project_tag && !knownProjects.includes(parsed.project_tag)) knownProjects.push(parsed.project_tag);
        if (parsed.project_tag) {
          const k = parsed.project_tag;
          const p = projectsCount.get(k) || { count: 0, income: 0, expense: 0 };
          p.count += 1;
          if (parsed.direction === "income") p.income += parsed.nominal;
          else p.expense += parsed.nominal;
          projectsCount.set(k, p);
        }
        const splits = parsed.accounts.length ? parsed.accounts : [{ account_raw: "kas", account_resolved: "Kas", amount: parsed.nominal, is_primary: true }];
        if (splits.length > 1) splitCount += 1;
        for (let si = 0; si < splits.length; si++) {
          const sp = splits[si];
          const accountResolved = resolveAccount(sp.account_raw, userAccounts, accountAliases);
          const flags = [...parsed.flags];
          if (accountResolved.unknown) flags.push("unknown_account");
          const tx: FinalTransaction = {
            id: crypto.randomUUID(),
            date: block.date,
            amount: Number(sp.amount || parsed.nominal || 0),
            type: (cat as { type?: "income" | "expense" | "transfer" }).type || parsed.direction,
            category_id: (cat as { id: string }).id || "cat_lainnya",
            category_name: (cat as { name: string }).name || "Lainnya",
            category_emoji: (cat as { emoji: string }).emoji || "🧾",
            account_id: normalizeText(accountResolved.accountName).replace(/\s+/g, "_"),
            account_name: accountResolved.accountName,
            description: parsed.description,
            notes: parsed.raw,
            project_tag: parsed.project_tag || null,
            quantity: parsed.quantity || null,
            splits: splits.length > 1 ? splits : undefined,
            split_group_id: splits.length > 1 ? `${block.date}_${normalizeText(parsed.description).slice(0, 32)}` : undefined,
            split_index: splits.length > 1 ? si : undefined,
            split_of: splits.length > 1 ? splits.length : undefined,
            split_total: splits.length > 1 ? parsed.nominal : undefined,
            source: "parsed_batch",
            confidence,
            flags,
            needs_review: confidence < 0.85 || flags.includes("low_confidence") || flags.includes("split_sum_mismatch") || flags.includes("split_incomplete"),
          };
          if (tx.confidence < 0.85) unresolved.push({ i: finals.length, description: tx.description, nominal: tx.amount, direction: parsed.direction, project_tag: parsed.project_tag || null });
          finals.push(tx);
        }
      }
    }

    const aiLearnedPatterns: Record<string, { id: string; name: string; emoji: string }> = {};
    if (unresolved.length && geminiKey) {
      try {
        const ai = await parseViaGeminiBatch(geminiKey, unresolved.slice(0, 20), userAccounts);
        for (const row of ai) {
          const idx = Number(row?.i);
          if (!Number.isFinite(idx) || idx < 0 || idx >= finals.length) continue;
          if (!row?.category_id || !row?.category_name) continue;
          finals[idx].category_id = String(row.category_id);
          finals[idx].category_name = String(row.category_name);
          finals[idx].category_emoji = String(row.category_emoji || "🧾");
          finals[idx].confidence = Math.max(finals[idx].confidence, Number(row.confidence || 0.86));
          if (!finals[idx].flags.includes("ai_resolved")) finals[idx].flags.push("ai_resolved");
          finals[idx].needs_review = finals[idx].confidence < 0.85;
          aiLearnedPatterns[normalizeText(finals[idx].description || finals[idx].notes || "")] = {
            id: finals[idx].category_id,
            name: finals[idx].category_name,
            emoji: finals[idx].category_emoji,
          };
        }
      } catch (e) {
        console.warn("batch AI resolver fallback:", (e as Error).message);
      }
    }

    const sums = finals.reduce(
      (acc, tx) => {
        if (tx.type === "income") acc.income += tx.amount;
        if (tx.type === "expense") acc.expense += tx.amount;
        if (tx.flags.includes("ai_resolved")) acc.ai += 1;
        if (tx.needs_review) acc.review += 1;
        return acc;
      },
      { income: 0, expense: 0, ai: 0, review: 0 },
    );
    const confAvg = finals.length ? Number((finals.reduce((a, b) => a + Number(b.confidence || 0), 0) / finals.length).toFixed(4)) : 0;
    const accounts = [...new Set(finals.map((x) => x.account_name))];
    const projectsDetected = [...projectsCount.entries()].map(([name, x]) => ({
      name,
      transaction_count: x.count,
      total_income: x.income,
      total_expense: x.expense,
    }));
    const accountsAutoCreated = [...new Set(finals.filter((x) => x.flags.includes("unknown_account")).map((x) => x.account_name))]
      .map((name) => ({ name, type: "other", detected_from: "batch_parse", suggested: true, pending_user_confirmation: true }));
    const review_queue = finals
      .filter((x) => x.needs_review)
      .slice(0, 25)
      .map((x) => ({ transaction_id: x.id, issue: "low confidence or unresolved fields", suggested_category: x.category_name, confidence: x.confidence, user_action_needed: "confirm_fields" }));

    const payload = {
      parse_session_id: crypto.randomUUID(),
      parsed_at: new Date().toISOString(),
      source_type: "whatsapp_batch",
      sender: wa.sender,
      total_messages: blocks.length,
      date_range: {
        from: blocks.map((b) => b.date).sort()[0] || null,
        to: blocks.map((b) => b.date).sort().slice(-1)[0] || null,
      },
      summary: {
        total_transactions: finals.length,
        total_expense: sums.expense,
        total_income: sums.income,
        split_payments: splitCount,
        accounts_involved: accounts,
        projects_detected: projectsDetected.map((p) => p.name),
        ai_resolved_count: sums.ai,
        confidence_avg: confAvg,
        needs_review_count: sums.review,
      },
      projects_detected: projectsDetected,
      accounts_auto_created: accountsAutoCreated,
      review_queue,
      transactions: finals,
    };

    if (Object.keys(aiLearnedPatterns).length) {
      try {
        const mergedLearning = {
          ...learning,
          description_patterns: {
            ...(descPatterns || {}),
            ...aiLearnedPatterns,
          },
          account_aliases: {
            ...(accountAliases || {}),
          },
          project_registry: knownProjects,
        };
        const nextSettings = {
          ...(settings || {}),
          batch_parser_learning: mergedLearning,
        };
        await supa.from("profiles").update({ settings: nextSettings }).eq("id", userData.user.id);
      } catch (e) {
        console.warn("learning update skipped:", (e as Error).message);
      }
    }

    if (mode === "text") {
      const one = finals[0];
      if (!one) return new Response(JSON.stringify({ error: "unable to parse transaction" }), { status: 400, headers: { ...corsHeaders, ...jsonHeaders } });
      return new Response(JSON.stringify({
        date: one.date,
        type: one.type === "transfer" ? "expense" : one.type,
        amount: one.amount,
        currency: "IDR",
        category: one.category_name,
        merchant: one.description,
        payment_method: one.account_name,
        account: one.account_name,
        notes: one.notes,
      }), { status: 200, headers: { ...corsHeaders, ...jsonHeaders } });
    }
    return new Response(JSON.stringify(payload), { status: 200, headers: { ...corsHeaders, ...jsonHeaders } });
  } catch (e) {
    console.error("❌ asfin-parse-transaction error:", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...corsHeaders, ...jsonHeaders } });
  }
});
