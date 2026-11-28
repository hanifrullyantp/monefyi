-- Migration: 20261127000000_agent_semantic_search.sql
-- Menambahkan pgvector extension dan tabel agent_embeddings untuk semantic search
-- pada context retrieval agent otonom.

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabel embeddings untuk context retrieval semantik
CREATE TABLE IF NOT EXISTS public.agent_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.planner_organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('sop', 'project', 'rap_item', 'work_item', 'pricelist', 'estimation', 'knowledge')),
  source_id text NOT NULL, -- ID dari sumber asli (sop_id, project_id, etc.)
  embedding vector(1536) NOT NULL, -- OpenAI ada-002 / text-embedding-3-small dimension
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index untuk pencarian vektor (HNSW)
CREATE INDEX IF NOT EXISTS idx_agent_embeddings_org_type ON public.agent_embeddings (org_id, content_type);
CREATE INDEX IF NOT EXISTS idx_agent_embeddings_embedding ON public.agent_embeddings USING hnsw (embedding vector_cosine_ops);

-- RLS
ALTER TABLE public.agent_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_embeddings_select ON public.agent_embeddings;
CREATE POLICY agent_embeddings_select ON public.agent_embeddings
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'worker'));

DROP POLICY IF EXISTS agent_embeddings_insert ON public.agent_embeddings;
CREATE POLICY agent_embeddings_insert ON public.agent_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'worker'));

DROP POLICY IF EXISTS agent_embeddings_update ON public.agent_embeddings;
CREATE POLICY agent_embeddings_update ON public.agent_embeddings
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

DROP POLICY IF EXISTS agent_embeddings_delete ON public.agent_embeddings;
CREATE POLICY agent_embeddings_delete ON public.agent_embeddings
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, 'owner'))
  WITH CHECK (public.is_org_member(org_id, 'owner'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_embeddings TO authenticated;

-- Fungsi untuk pencarian semantik berdasarkan cosine similarity (H-AUD-08: guard is_org_member)
CREATE OR REPLACE FUNCTION public.agent_semantic_search(
  p_org_id uuid,
  p_query_embedding vector(1536),
  p_content_type text DEFAULT NULL,
  p_limit integer DEFAULT 5,
  p_threshold float8 DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  content text,
  content_type text,
  source_id text,
  similarity float8,
  metadata jsonb
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_org_id, 'worker') THEN
    RAISE EXCEPTION 'di_luar_wewenang' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.content_type,
    e.source_id,
    1 - (e.embedding <=> p_query_embedding) AS similarity,
    e.metadata
  FROM public.agent_embeddings e
  WHERE e.org_id = p_org_id
    AND (p_content_type IS NULL OR e.content_type = p_content_type)
    AND 1 - (e.embedding <=> p_query_embedding) >= p_threshold
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.agent_semantic_search(uuid, vector, text, integer, float8) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agent_semantic_search(uuid, vector, text, integer, float8) TO authenticated;

-- Fungsi untuk menyimpan embedding ke database (H-AUD-08: guard is_org_member)
CREATE OR REPLACE FUNCTION public.agent_store_embedding(
  p_org_id uuid,
  p_content text,
  p_content_type text,
  p_source_id text,
  p_embedding vector(1536),
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_member(p_org_id, 'worker') THEN
    RAISE EXCEPTION 'di_luar_wewenang' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.agent_embeddings (org_id, content, content_type, source_id, embedding, metadata)
  VALUES (p_org_id, p_content, p_content_type, p_source_id, p_embedding, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.agent_store_embedding(uuid, text, text, text, vector, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agent_store_embedding(uuid, text, text, text, vector, jsonb) TO authenticated;

-- Trigger untuk updated_at
CREATE OR REPLACE FUNCTION public.update_agent_embeddings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_agent_embeddings_updated_at
BEFORE UPDATE ON public.agent_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_embeddings_updated_at();
