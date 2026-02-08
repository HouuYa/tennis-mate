-- ============================================================
-- Tennis Rules RAG System - Database Setup
-- ============================================================
-- This migration creates tables and functions for the Tennis Rules
-- Retrieval-Augmented Generation (RAG) system using pgvector.
--
-- Date: 2026-01-14 (updated: 2026-02-08)
-- Description: Enable vector similarity search for tennis rules
--
-- Actual DB schema (Tennis_Rules_RAG):
--   tennis_rules: id, source_file, rule_id, content, metadata, embedding, created_at
--   Embedding model: gemini-embedding-001 (768 dimensions)
--   Index: HNSW (cosine distance)
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create tennis_rules table
CREATE TABLE IF NOT EXISTS tennis_rules (
    id BIGSERIAL PRIMARY KEY,

    -- Content fields
    source_file TEXT NOT NULL,          -- Source filename (e.g. "테니스규정집(2020.11.20 개정판).pdf")
    rule_id TEXT NOT NULL,              -- Rule/article ID (e.g. "1. 코트 (THE COURT)")
    content TEXT NOT NULL,              -- Full text of the rule chunk
    metadata JSONB,                     -- Additional metadata (language, section_type, etc.)

    -- Vector embedding (768 dimensions for gemini-embedding-001)
    embedding VECTOR(768),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS tennis_rules_embedding_cosine_idx
ON tennis_rules
USING hnsw (embedding vector_cosine_ops);

-- 4. Create additional indexes for filtering
CREATE INDEX IF NOT EXISTS tennis_rules_rule_id_idx ON tennis_rules(rule_id);
CREATE INDEX IF NOT EXISTS tennis_rules_source_file_idx ON tennis_rules(source_file);

-- 5. Create vector similarity search function
CREATE OR REPLACE FUNCTION match_tennis_rules(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id BIGINT,
    source_file TEXT,
    rule_id TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tennis_rules.id,
        tennis_rules.source_file,
        tennis_rules.rule_id,
        tennis_rules.content,
        tennis_rules.metadata,
        1 - (tennis_rules.embedding <=> query_embedding) AS similarity
    FROM tennis_rules
    WHERE 1 - (tennis_rules.embedding <=> query_embedding) > match_threshold
    ORDER BY tennis_rules.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 6. RLS (Row Level Security) policies
ALTER TABLE tennis_rules ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view tennis rules"
    ON tennis_rules
    FOR SELECT
    USING (true);

-- Only service role can insert/update/delete (ETL scripts)
CREATE POLICY "Service role can insert tennis rules"
    ON tennis_rules
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update tennis rules"
    ON tennis_rules
    FOR UPDATE
    USING (true);

CREATE POLICY "Service role can delete tennis rules"
    ON tennis_rules
    FOR DELETE
    USING (true);

-- 7. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON tennis_rules TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_tennis_rules TO anon, authenticated;

-- ============================================================
-- Setup Complete!
-- ============================================================
-- Next steps:
-- 1. Run the ETL: extract_pdf_gemini.py → gen_sql_from_txt.py → upload_rules.py
-- 2. Test: SELECT * FROM match_tennis_rules(...)
-- 3. Deploy Edge Function: supabase functions deploy search-tennis-rules
-- ============================================================
