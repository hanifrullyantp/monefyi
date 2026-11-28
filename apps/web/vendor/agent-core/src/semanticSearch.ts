/**
 * Semantic Search / Embedding untuk Context Retrieval Agent Otonom.
 *
 * Menyediakan pencarian konteks berbasis vektor (semantic) yang digabungkan
 * dengan pencarian kata kunci (hybrid search) untuk retrieval konteks yang
 * lebih akurat dari sekadar pencarian deterministik.
 *
 * File ini bekerja di kedua lingkungan: browser/Vite (frontend) dan Deno (Supabase Edge Functions).
 */

let createClient: any = null;

try {
  // Hanya tersedia di lingkungan Deno (Supabase Edge Functions)
  const supabaseModule = await import("@supabase/supabase-js");
  createClient = supabaseModule.createClient;
} catch {
  // Tidak tersedia di frontend/Vite — akan menggunakan fallback
}

export type SemanticSearchResult = {
  id: string;
  content: string;
  content_type: string;
  source_id: string;
  similarity: number;
  metadata: Record<string, unknown>;
};

export type SemanticSearchOptions = {
  orgId: string;
  query: string;
  contentType?: string;
  limit?: number;
  threshold?: number;
  accessToken: string;
  clientFactory?: (accessToken: string) => any;
};

export type EmbeddingOptions = {
  orgId: string;
  content: string;
  contentType: string;
  sourceId: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  accessToken: string;
  clientFactory?: (accessToken: string) => any;
};

function getEnv(key: string): string | undefined {
  const deno = (globalThis as any).Deno;
  if (deno && deno.env) {
    return deno.env.get(key);
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

/** Escape wildcard SQL LIKE/ILIKE (%, _, dan \) agar tidak bisa dimanipulasi untuk wildcard injection (H-AUD-08). */
export function escapeSqlLikePattern(raw: string): string {
  return String(raw ?? '').replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function resolveSupabaseClient(accessToken: string, customFactory?: (token: string) => any): any | null {
  if (customFactory) {
    return customFactory(accessToken);
  }
  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !createClient) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Generate embedding untuk teks menggunakan AI provider yang tersedia. */
export async function generateEmbedding(
  text: string,
  accessToken: string,
  clientFactory?: (token: string) => any,
): Promise<number[]> {
  const supabase = resolveSupabaseClient(accessToken, clientFactory);
  if (!supabase) {
    return deterministicEmbedding(text);
  }

  const { data, error } = await supabase.functions.invoke("agent-generate-embedding", {
    body: { text },
  });

  if (error || !data?.embedding) {
    return deterministicEmbedding(text);
  }

  return data.embedding as number[];
}

/** Embedding deterministik sebagai fallback ketika AI provider tidak tersedia. */
function deterministicEmbedding(text: string): number[] {
  const dim = 1536;
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    let hash = 0;
    for (let j = 0; j < tokens[i].length; j++) {
      hash = ((hash << 5) - hash + tokens[i].charCodeAt(j)) | 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1 / Math.sqrt(tokens.length);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map(v => v / norm) : vec;
}

/** Simpan embedding ke database. */
export async function storeEmbedding(
  opts: EmbeddingOptions,
): Promise<string> {
  if (!opts.orgId || !String(opts.orgId).trim()) {
    throw new Error("orgId wajib diisi untuk storeEmbedding.");
  }
  const supabase = resolveSupabaseClient(opts.accessToken, opts.clientFactory);
  if (!supabase) {
    throw new Error("Supabase client tidak tersedia di lingkungan ini.");
  }

  const { data, error } = await supabase.rpc("agent_store_embedding", {
    p_org_id: opts.orgId,
    p_content: opts.content,
    p_content_type: opts.contentType,
    p_source_id: opts.sourceId,
    p_embedding: opts.embedding,
    p_metadata: opts.metadata ?? {},
  });

  if (error) throw error;
  return data as string;
}

/** Cari konteks secara semantik berdasarkan query. */
export async function semanticSearch(
  opts: SemanticSearchOptions,
): Promise<SemanticSearchResult[]> {
  if (!opts.orgId || !String(opts.orgId).trim()) {
    throw new Error("orgId wajib diisi untuk semanticSearch.");
  }
  const supabase = resolveSupabaseClient(opts.accessToken, opts.clientFactory);
  if (!supabase) {
    throw new Error("Supabase client tidak tersedia di lingkungan ini.");
  }

  const queryEmbedding = await generateEmbedding(opts.query, opts.accessToken, opts.clientFactory);

  const { data, error } = await supabase.rpc("agent_semantic_search", {
    p_org_id: opts.orgId,
    p_query_embedding: queryEmbedding,
    p_content_type: opts.contentType ?? null,
    p_limit: opts.limit ?? 5,
    p_threshold: opts.threshold ?? 0.7,
  });

  if (error) throw error;
  return ((data ?? []) as Array<SemanticSearchResult & { org_id?: string }>)
    .filter((r) => !r.org_id || r.org_id === opts.orgId)
    .filter((r) => !opts.contentType || r.content_type === opts.contentType)
    .map((r) => ({
      id: r.id,
      content: r.content,
      content_type: r.content_type,
      source_id: r.source_id,
      similarity: Number(r.similarity),
      metadata: r.metadata ?? {},
    }));
}

/** Hybrid search: gabungkan semantic search + keyword search dengan escaping % dan _ serta filter contentType (H-AUD-08). */
export async function hybridSearch(
  opts: SemanticSearchOptions & { keywordBoost?: number },
): Promise<SemanticSearchResult[]> {
  const semanticResults = await semanticSearch({
    orgId: opts.orgId,
    query: opts.query,
    contentType: opts.contentType,
    limit: opts.limit ?? 5,
    threshold: opts.threshold ?? 0.5,
    accessToken: opts.accessToken,
    clientFactory: opts.clientFactory,
  });

  if (semanticResults.length === 0) {
    const supabase = resolveSupabaseClient(opts.accessToken, opts.clientFactory);
    if (!supabase) {
      return semanticResults;
    }

    const escapedQuery = escapeSqlLikePattern(opts.query);
    if (!escapedQuery.trim()) {
      return [];
    }

    let queryBuilder = supabase
      .from("agent_embeddings")
      .select("id, content, content_type, source_id, metadata")
      .eq("org_id", opts.orgId);

    if (opts.contentType) {
      queryBuilder = queryBuilder.eq("content_type", opts.contentType);
    }

    const { data, error } = await queryBuilder
      .ilike("content", `%${escapedQuery}%`)
      .limit(opts.limit ?? 5);

    if (error) throw error;
    return ((data ?? []) as Array<{
      id: string;
      org_id?: string;
      content: string;
      content_type: string;
      source_id: string;
      metadata: Record<string, unknown>;
    }>)
      .filter((r) => !r.org_id || r.org_id === opts.orgId)
      .filter((r) => !opts.contentType || r.content_type === opts.contentType)
      .map((r) => ({
        id: r.id,
        content: r.content,
        content_type: r.content_type,
        source_id: r.source_id,
        metadata: r.metadata ?? {},
        similarity: 0.5,
      }));
  }

  return semanticResults;
}
