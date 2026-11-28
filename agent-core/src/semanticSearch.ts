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
};

export type EmbeddingOptions = {
  orgId: string;
  content: string;
  contentType: string;
  sourceId: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  accessToken: string;
};

function getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno.env) {
    return Deno.env.get(key);
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

/** Generate embedding untuk teks menggunakan AI provider yang tersedia. */
export async function generateEmbedding(
  text: string,
  accessToken: string,
): Promise<number[]> {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !createClient) {
    // Fallback: hash-based deterministic embedding (untuk development tanpa AI provider)
    return deterministicEmbedding(text);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  // Panggil edge function untuk generate embedding (jika tersedia)
  const { data, error } = await supabase.functions.invoke("agent-generate-embedding", {
    body: { text },
  });

  if (error || !data?.embedding) {
    // Fallback: hash-based deterministic embedding
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
  // Normalisasi
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map(v => v / norm) : vec;
}

/** Simpan embedding ke database. */
export async function storeEmbedding(
  opts: EmbeddingOptions,
): Promise<string> {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !createClient) {
    throw new Error("Supabase client tidak tersedia di lingkungan ini.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${opts.accessToken}` } },
  });

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
  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !createClient) {
    throw new Error("Supabase client tidak tersedia di lingkungan ini.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${opts.accessToken}` } },
  });

  // Generate embedding untuk query
  const queryEmbedding = await generateEmbedding(opts.query, opts.accessToken);

  const { data, error } = await supabase.rpc("agent_semantic_search", {
    p_org_id: opts.orgId,
    p_query_embedding: queryEmbedding,
    p_content_type: opts.contentType ?? null,
    p_limit: opts.limit ?? 5,
    p_threshold: opts.threshold ?? 0.7,
  });

  if (error) throw error;
  return (data as SemanticSearchResult[]).map((r) => ({
    ...r,
    similarity: Number(r.similarity),
  }));
}

/** Hybrid search: gabungkan semantic search + keyword search untuk hasil terbaik. */
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
  });

  // Jika tidak ada hasil semantik yang cukup, coba keyword search sederhana
  if (semanticResults.length === 0) {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !createClient) {
      return semanticResults;
    }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${opts.accessToken}` } },
  });

    const { data, error } = await supabase
      .from("agent_embeddings")
      .select("id, content, content_type, source_id, metadata")
      .eq("org_id", opts.orgId)
      .ilike("content", `%${opts.query}%`)
      .limit(opts.limit ?? 5);

    if (error) throw error;
    return (data as Array<{
      id: string;
      content: string;
      content_type: string;
      source_id: string;
      metadata: Record<string, unknown>;
    }>).map((r) => ({
      ...r,
      similarity: 0.5, // default similarity untuk keyword match
    }));
  }

  return semanticResults;
}
