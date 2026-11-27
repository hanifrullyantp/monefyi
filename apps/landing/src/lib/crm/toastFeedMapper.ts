import { isTestAdminLead } from "@/lib/config/admin";

export type ToastCategory = "standard" | "pro" | "bundle" | "upgrade" | "free";

export interface PublicToastItem {
  id: string;
  name: string;
  action: string;
  product: string;
  location: string;
  occurredAt: string;
  timeAgo: string;
  category: ToastCategory;
  quantity: number;
  source: "crm";
}

export interface RawCrmOrderRow {
  id?: string | null;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  status?: string | null;
  grand_total?: number | string | null;
  product_title?: string | null;
  created_at?: string | null;
  raw_payload?: Record<string, unknown> | null;
}

export interface BuildToastFeedOptions {
  includeFree?: boolean;
  maskName?: boolean;
  limit?: number;
  now?: Date;
}

export interface ToastFeedSummary {
  total: number;
  standard: number;
  pro: number;
  bundle: number;
  upgrade: number;
  free: number;
}

const PLACEHOLDER_NAMES = new Set([
  "",
  "anonim",
  "lead checkout",
  "lead checkout (draft)",
  "pelanggan",
  "pelanggan mayar",
  "pelanggan estimator",
  "pengguna",
  "user",
  "guest",
  "customer",
]);

const PREFIX_TOKENS = new Set([
  "m",
  "m.",
  "muh",
  "muh.",
  "muhammad",
  "moh",
  "moh.",
  "mohammad",
  "moch",
  "moch.",
  "ach",
  "ach.",
  "h",
  "h.",
  "hj",
  "hj.",
  "ir",
  "ir.",
  "dr",
  "dr.",
  "drs",
  "drs.",
  "bp",
  "bpk",
  "pak",
  "bu",
  "ibu",
]);

function titleCaseToken(token: string): string {
  if (!token) return "";
  // Preserve dotted initials like "M.Rudi" -> split on dot if needed
  if (token.includes(".")) {
    return token
      .split(".")
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
      .join(".");
  }
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Format nama pelanggan secara faktual tanpa mengubah identitasnya.
 * Jika `maskName` aktif, nama disingkat sambil mempertahankan nama panggilan:
 * - "Budi Santoso" -> "Budi S."
 * - "M. Rudi Santoso" / "M.Rudi Santoso" -> "M. Rudi"
 * - "Muhammad Rudi" / "Muhammad Rudi Santoso" -> "M. Rudi"
 * - "Suryadi" -> "Suryadi"
 */
export function formatToastCustomerName(rawName: string, maskName = true): string {
  const cleaned = rawName.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const rawTokens = cleaned.split(" ").filter(Boolean);
  const formattedTokens = rawTokens.map(titleCaseToken);

  // Jika kata pertama sudah berupa "M.Rudi" (tanpa spasi setelah titik)
  if (/^[a-z]{1,3}\.[a-z]{2,}$/i.test(rawTokens[0])) {
    const [prefixPart, callPart] = rawTokens[0].split(".");
    const base = `${prefixPart.toUpperCase()}. ${titleCaseToken(callPart)}`;
    if (!maskName || formattedTokens.length === 1) {
      return formattedTokens.length === 1 ? base : `${base} ${formattedTokens.slice(1).join(" ")}`;
    }
    const lastInitial = formattedTokens[1].replace(/\./g, "").charAt(0).toUpperCase();
    return lastInitial ? `${base} ${lastInitial}.` : base;
  }

  if (!maskName || formattedTokens.length <= 1) {
    return formattedTokens.join(" ");
  }

  const firstLower = rawTokens[0].toLowerCase();
  // Jika kata pertama adalah gelar/singkatan umum ("M.", "Muh.", "Muhammad", "H.", dll)
  if (PREFIX_TOKENS.has(firstLower)) {
    const prefix =
      firstLower === "muhammad" || firstLower === "mohammad"
        ? "M."
        : formattedTokens[0].endsWith(".")
        ? formattedTokens[0]
        : `${formattedTokens[0]}.`;
    const callName = formattedTokens[1];
    if (formattedTokens.length === 2) {
      return `${prefix} ${callName}`;
    }
    const lastInitial = formattedTokens[2].replace(/\./g, "").charAt(0).toUpperCase();
    return lastInitial ? `${prefix} ${callName} ${lastInitial}.` : `${prefix} ${callName}`;
  }

  const firstName = formattedTokens[0];
  const secondInitial = formattedTokens[1].replace(/\./g, "").charAt(0).toUpperCase();
  return secondInitial ? `${firstName} ${secondInitial}.` : firstName;
}

export function formatToastRelativeTime(dateInput: string | Date, now = new Date()): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "Baru saja";

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 2) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function isRecentWithin24Hours(occurredAt: string, now: Date): boolean {
  const ts = new Date(occurredAt).getTime();
  if (Number.isNaN(ts)) return false;
  return now.getTime() - ts < 24 * 60 * 60 * 1000;
}

interface NormalizedOrder {
  id: string;
  customerKey: string;
  rawName: string;
  location: string;
  occurredAt: string;
  timestampMs: number;
  isPaid: boolean;
  isFreeActive: boolean;
  planTier: "free" | "standard" | "pro";
  bumpTaken: boolean;
  quantity: number;
  amount: number;
  brand: "froyek" | "estimator";
  froyekPlan: string;
}

function normalizeCustomerKey(email: string, phone: string, name: string, fallbackId: string): string {
  const cleanEmail = email.trim().toLowerCase();
  if (
    cleanEmail &&
    cleanEmail.includes("@") &&
    !cleanEmail.endsWith("@monefyi.temp") &&
    !cleanEmail.startsWith("session_") &&
    !cleanEmail.startsWith("mayar_")
  ) {
    return `email:${cleanEmail}`;
  }
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length >= 8) {
    return `phone:${digits.slice(-9)}`;
  }
  const cleanName = name.trim().toLowerCase();
  return cleanName ? `name:${cleanName}` : `id:${fallbackId}`;
}

function classifySingleOrder(order: NormalizedOrder, recent: boolean): {
  category: ToastCategory;
  action: string;
  product: string;
  quantity: number;
} {
  if (order.isFreeActive) {
    return {
      category: "free",
      action: recent ? "baru saja mulai menggunakan" : "mulai menggunakan",
      product: "Estimator Free",
      quantity: 1,
    };
  }

  if (order.brand === "froyek" && order.froyekPlan) {
    const planLabel = order.froyekPlan.charAt(0).toUpperCase() + order.froyekPlan.slice(1);
    return {
      category: "pro",
      action: recent ? "baru saja membeli" : "telah membeli",
      product: `Froyek ${planLabel}`,
      quantity: order.quantity,
    };
  }

  // Beli 2 akun PRO sekaligus (PRO + Order Bump, atau nominal >= 280rb, atau quantity >= 2)
  if (
    order.planTier === "pro" &&
    (order.bumpTaken || order.quantity >= 2 || order.amount >= 280000)
  ) {
    const qty = Math.max(2, order.quantity);
    return {
      category: "bundle",
      action: recent ? "baru saja membeli" : "telah membeli",
      product: `${qty} Akun Estimator PRO`,
      quantity: qty,
    };
  }

  // Standard + Order Bump Upgrade ke PRO
  if (
    order.planTier === "standard" &&
    (order.bumpTaken || (order.amount >= 135000 && order.amount < 185000))
  ) {
    return {
      category: "upgrade",
      action: recent ? "baru saja membeli Standard + upgrade" : "telah membeli Standard + upgrade",
      product: "Estimator PRO",
      quantity: 1,
    };
  }

  if (order.planTier === "pro") {
    return {
      category: "pro",
      action: recent ? "baru saja membeli" : "telah membeli",
      product: "Estimator PRO",
      quantity: 1,
    };
  }

  return {
    category: "standard",
    action: recent ? "baru saja membeli" : "telah membeli",
    product: "Estimator Standard",
    quantity: 1,
  };
}

function normalizeOrderRow(row: RawCrmOrderRow): NormalizedOrder | null {
  const raw = (row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {}) as Record<
    string,
    unknown
  >;

  const email = String(row.email || raw.email || raw.customerEmail || "").trim().toLowerCase();
  const rawName = String(row.full_name || raw.name || raw.customerName || "").trim();
  const phone = String(row.phone || raw.phone || raw.customerMobile || "").trim();
  const tags = Array.isArray(raw.tags) ? (raw.tags as string[]) : undefined;
  const notes = typeof raw.notes === "string" ? raw.notes : undefined;

  if (isTestAdminLead({ email, name: rawName, phone, tags, notes })) {
    return null;
  }

  if (!rawName || rawName.length < 2 || PLACEHOLDER_NAMES.has(rawName.toLowerCase())) {
    return null;
  }

  const amount = Number(row.grand_total ?? raw.amount ?? 0) || 0;
  const topStatus = String(row.status || "").trim().toLowerCase();
  const rawStatus = String(raw.status || "").trim().toLowerCase();
  const productTitle = String(row.product_title || "").trim();
  const lowerTitle = productTitle.toLowerCase();

  let planTier: "free" | "standard" | "pro" = "standard";
  if (raw.planTier === "free" || raw.planTier === "standard" || raw.planTier === "pro") {
    planTier = raw.planTier;
  } else if (lowerTitle.includes("free")) {
    planTier = "free";
  } else if (lowerTitle.includes("pro") || (amount >= 185000 && amount > 0)) {
    planTier = "pro";
  }

  const bumpTaken = Boolean(raw.bumpTaken);
  const quantity = Math.max(1, Number(raw.quantity || 1) || 1);
  const isFreeOrder = planTier === "free" && !bumpTaken && amount <= 0;

  const isFreeActive =
    isFreeOrder &&
    (topStatus === "free_active" ||
      rawStatus === "free_active" ||
      topStatus === "paid" ||
      rawStatus === "won");

  const isPaid =
    !isFreeOrder &&
    amount > 0 &&
    (topStatus === "paid" || rawStatus === "won" || raw.verifiedViaMayar === true);

  if (!isPaid && !isFreeActive) {
    return null;
  }

  const occurredAtRaw = String(raw.paidAt || row.created_at || raw.createdAt || "");
  const parsedDate = new Date(occurredAtRaw);
  const occurredAt = Number.isNaN(parsedDate.getTime())
    ? new Date().toISOString()
    : parsedDate.toISOString();

  const city = String(raw.city || raw.location || "").trim();
  const brand = raw.brand === "froyek" ? "froyek" : "estimator";
  const froyekPlan = typeof raw.froyekPlan === "string" ? raw.froyekPlan : "";
  const id = String(row.id || raw.id || raw.sessionId || `${rawName}_${occurredAt}`);

  return {
    id,
    customerKey: normalizeCustomerKey(email, phone, rawName, id),
    rawName,
    location: city,
    occurredAt,
    timestampMs: new Date(occurredAt).getTime(),
    isPaid,
    isFreeActive,
    planTier: isPaid && planTier === "free" ? "standard" : planTier,
    bumpTaken,
    quantity,
    amount,
    brand,
    froyekPlan,
  };
}

function buildBundleCopy(orders: NormalizedOrder[], recent: boolean): {
  category: ToastCategory;
  action: string;
  product: string;
  quantity: number;
} {
  let proCount = 0;
  let stdCount = 0;
  let otherCount = 0;

  for (const ord of orders) {
    if (ord.planTier === "pro") {
      proCount += ord.bumpTaken ? Math.max(2, ord.quantity) : ord.quantity;
    } else if (ord.planTier === "standard") {
      if (ord.bumpTaken) {
        proCount += 1;
      } else {
        stdCount += ord.quantity;
      }
    } else {
      otherCount += ord.quantity;
    }
  }

  const totalQty = proCount + stdCount + otherCount;
  const action = recent ? "baru saja membeli" : "telah membeli";

  if (proCount >= 2 && stdCount === 0 && otherCount === 0) {
    return {
      category: "bundle",
      action,
      product: `${proCount} Akun Estimator PRO`,
      quantity: proCount,
    };
  }

  if (stdCount >= 2 && proCount === 0 && otherCount === 0) {
    return {
      category: "bundle",
      action,
      product: `${stdCount} Akun Estimator Standard`,
      quantity: stdCount,
    };
  }

  if (proCount >= 1 && stdCount >= 1) {
    return {
      category: "bundle",
      action,
      product: "Estimator Standard & PRO sekaligus",
      quantity: totalQty,
    };
  }

  return {
    category: "bundle",
    action,
    product: `${totalQty} Akun Estimator`,
    quantity: totalQty,
  };
}

export function buildToastFeedFromOrders(
  rows: RawCrmOrderRow[],
  options: BuildToastFeedOptions = {},
): { items: PublicToastItem[]; summary: ToastFeedSummary } {
  const { includeFree = true, maskName = true, limit = 30, now = new Date() } = options;

  const normalized: NormalizedOrder[] = [];
  for (const row of rows || []) {
    const item = normalizeOrderRow(row);
    if (item) normalized.push(item);
  }

  // Kelompokkan per pelanggan untuk mendeteksi pembelian ganda dalam 24 jam & upgrade dari Free
  const byCustomer = new Map<string, NormalizedOrder[]>();
  for (const ord of normalized) {
    const list = byCustomer.get(ord.customerKey) || [];
    list.push(ord);
    byCustomer.set(ord.customerKey, list);
  }

  const items: PublicToastItem[] = [];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const [, custOrders] of byCustomer.entries()) {
    const sorted = [...custOrders].sort((a, b) => b.timestampMs - a.timestampMs);
    const paidOrders = sorted.filter((o) => o.isPaid);
    const freeOrders = sorted.filter((o) => o.isFreeActive);

    if (paidOrders.length > 0) {
      // Kelompokkan order berbayar yang berdekatan (<= 24 jam) sebagai pembelian sekaligus
      const used = new Set<string>();
      for (let i = 0; i < paidOrders.length; i += 1) {
        const head = paidOrders[i];
        if (used.has(head.id)) continue;
        used.add(head.id);

        const cluster = [head];
        for (let j = i + 1; j < paidOrders.length; j += 1) {
          const candidate = paidOrders[j];
          if (used.has(candidate.id)) continue;
          if (Math.abs(head.timestampMs - candidate.timestampMs) <= ONE_DAY_MS) {
            cluster.push(candidate);
            used.add(candidate.id);
          }
        }

        const recent = isRecentWithin24Hours(head.occurredAt, now);
        const copy =
          cluster.length >= 2
            ? buildBundleCopy(cluster, recent)
            : classifySingleOrder(head, recent);

        // Jika pelanggan sebelumnya pernah daftar Free dan sekarang beli 1 akun, tampilkan konteks upgrade jika belum bundle
        if (cluster.length === 1 && freeOrders.length > 0 && copy.category !== "bundle" && copy.category !== "upgrade") {
          copy.action = recent ? "baru saja upgrade ke" : "upgrade ke";
          copy.category = "upgrade";
        }

        items.push({
          id: head.id,
          name: formatToastCustomerName(head.rawName, maskName),
          action: copy.action,
          product: copy.product,
          location: head.location,
          occurredAt: head.occurredAt,
          timeAgo: formatToastRelativeTime(head.occurredAt, now),
          category: copy.category,
          quantity: copy.quantity,
          source: "crm",
        });
      }
      continue;
    }

    // Pelanggan hanya memiliki aktivasi Free
    if (includeFree && freeOrders.length > 0) {
      const latestFree = freeOrders[0];
      const recent = isRecentWithin24Hours(latestFree.occurredAt, now);
      const copy = classifySingleOrder(latestFree, recent);
      items.push({
        id: latestFree.id,
        name: formatToastCustomerName(latestFree.rawName, maskName),
        action: copy.action,
        product: copy.product,
        location: latestFree.location,
        occurredAt: latestFree.occurredAt,
        timeAgo: formatToastRelativeTime(latestFree.occurredAt, now),
        category: copy.category,
        quantity: 1,
        source: "crm",
      });
    }
  }

  // Urutkan dari yang paling baru
  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const limited = items.slice(0, Math.max(1, limit));
  const summary: ToastFeedSummary = {
    total: limited.length,
    standard: limited.filter((i) => i.category === "standard").length,
    pro: limited.filter((i) => i.category === "pro").length,
    bundle: limited.filter((i) => i.category === "bundle").length,
    upgrade: limited.filter((i) => i.category === "upgrade").length,
    free: limited.filter((i) => i.category === "free").length,
  };

  return { items: limited, summary };
}
