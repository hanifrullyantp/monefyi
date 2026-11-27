import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { resolveSupabaseEnv } from "@/lib/supabase/env";
import {
  buildToastFeedFromOrders,
  type PublicToastItem,
  type RawCrmOrderRow,
  type ToastFeedSummary,
} from "@/lib/crm/toastFeedMapper";

interface CachedToastFeed {
  expiresAt: number;
  items: PublicToastItem[];
  summary: ToastFeedSummary;
  syncedAt: string;
}

const FEED_CACHE_TTL_MS = 60 * 1000;
const feedCache = new Map<string, CachedToastFeed>();

function getOrdersReaderClient() {
  const { url } = resolveSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && serviceRoleKey) {
    return createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return getSupabaseClient();
}

/**
 * GET /api/landing/toast-feed
 * Mengembalikan daftar aktivitas pelanggan nyata dari tabel CRM `orders`
 * tanpa membocorkan PII (email, nomor WA, paymentId, maupun nominal uang).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeFree = searchParams.get("includeFree") !== "false";
    const maskName = searchParams.get("maskName") !== "false";
    const refresh = searchParams.get("refresh") === "1";
    const rawLimit = Number(searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit)
      ? Math.min(50, Math.max(1, Math.floor(rawLimit)))
      : 30;

    const cacheKey = `${includeFree ? "1" : "0"}_${maskName ? "1" : "0"}_${limit}`;
    const nowMs = Date.now();
    const cached = feedCache.get(cacheKey);
    if (!refresh && cached && cached.expiresAt > nowMs) {
      return NextResponse.json(
        {
          ok: true,
          items: cached.items,
          summary: cached.summary,
          syncedAt: cached.syncedAt,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }

    const supabase = getOrdersReaderClient();
    if (!supabase) {
      return NextResponse.json({
        ok: true,
        items: [],
        summary: { total: 0, standard: 0, pro: 0, bundle: 0, upgrade: 0, free: 0 },
        syncedAt: new Date().toISOString(),
      });
    }

    const { data: rows, error } = await supabase
      .from("orders")
      .select("id, email, full_name, phone, status, grand_total, product_title, created_at, raw_payload")
      .order("created_at", { ascending: false })
      .limit(250);

    if (error) {
      console.warn("[toast-feed] Supabase query warning:", error.message);
      return NextResponse.json({
        ok: false,
        items: [],
        summary: { total: 0, standard: 0, pro: 0, bundle: 0, upgrade: 0, free: 0 },
        syncedAt: new Date().toISOString(),
      });
    }

    const { items, summary } = buildToastFeedFromOrders(
      (rows || []) as RawCrmOrderRow[],
      { includeFree, maskName, limit },
    );

    const syncedAt = new Date().toISOString();
    feedCache.set(cacheKey, {
      expiresAt: nowMs + FEED_CACHE_TTL_MS,
      items,
      summary,
      syncedAt,
    });

    return NextResponse.json(
      {
        ok: true,
        items,
        summary,
        syncedAt,
      },
      {
        headers: {
          "Cache-Control": refresh
            ? "no-store"
            : "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        items: [],
        summary: { total: 0, standard: 0, pro: 0, bundle: 0, upgrade: 0, free: 0 },
      },
      { status: 500 },
    );
  }
}

