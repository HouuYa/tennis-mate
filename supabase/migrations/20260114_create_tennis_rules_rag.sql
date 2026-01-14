-- ============================================================
-- Tennis Rules RAG System - Database Setup
-- ============================================================
-- This migration creates tables and functions for the Tennis Rules
-- Retrieval-Augmented Generation (RAG) system using pgvector.
--
-- Date: 2026-01-14
-- Description: Enable vector similarity search for tennis rules
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create tennis_rules table
CREATE TABLE IF NOT EXISTS tennis_rules (
    id BIGSERIAL PRIMARY KEY,

    -- Content fields
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_file TEXT NOT NULL,
    language VARCHAR(2) NOT NULL CHECK (language IN ('en', 'ko')),
    chunk_index INTEGER NOT NULL,

    -- Vector embedding (768 dimensions for Gemini text-embedding-004)
    embedding vector(768) NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index on embedding for fast similarity search
-- Using ivfflat index for approximate nearest neighbor search
-- lists = sqrt(rows) is a good rule of thumb
CREATE INDEX IF NOT EXISTS tennis_rules_embedding_idx
ON tennis_rules
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Create index on language for filtering
CREATE INDEX IF NOT EXISTS tennis_rules_language_idx
ON tennis_rules (language);

-- 5. Create index on source_file for querying by document
CREATE INDEX IF NOT EXISTS tennis_rules_source_file_idx
ON tennis_rules (source_file);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically update updated_at
CREATE TRIGGER update_tennis_rules_updated_at
    BEFORE UPDATE ON tennis_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_tennis_rules(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5,
    filter_language text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    title text,
    content text,
    source_file text,
    language varchar(2),
    chunk_index integer,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tennis_rules.id,
        tennis_rules.title,
        tennis_rules.content,
        tennis_rules.source_file,
        tennis_rules.language,
        tennis_rules.chunk_index,
        1 - (tennis_rules.embedding <=> query_embedding) AS similarity
    FROM tennis_rules
    WHERE
        (filter_language IS NULL OR tennis_rules.language = filter_language)
        AND (1 - (tennis_rules.embedding <=> query_embedding)) > match_threshold
    ORDER BY tennis_rules.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 9. Create RLS (Row Level Security) policies
ALTER TABLE tennis_rules ENABLE ROW LEVEL SECURITY;

-- Allow public read access (authenticated users can query tennis rules)
CREATE POLICY "Anyone can view tennis rules"
    ON tennis_rules
    FOR SELECT
    USING (true);

-- Only service role can insert/update/delete
-- (ETL script uses service_role key)
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

-- 10. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON tennis_rules TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_tennis_rules TO anon, authenticated;

-- 11. Create view for statistics
CREATE OR REPLACE VIEW tennis_rules_stats AS
SELECT
    COUNT(*) AS total_chunks,
    COUNT(DISTINCT source_file) AS total_files,
    COUNT(*) FILTER (WHERE language = 'en') AS english_chunks,
    COUNT(*) FILTER (WHERE language = 'ko') AS korean_chunks,
    MIN(created_at) AS first_upload,
    MAX(created_at) AS last_upload
FROM tennis_rules;

GRANT SELECT ON tennis_rules_stats TO anon, authenticated;

-- ============================================================
-- Setup Complete!
-- ============================================================
-- Next steps:
-- 1. Run the ETL script: python scripts/upload_tennis_rules.py
-- 2. Test the search: SELECT * FROM match_tennis_rules(...)
-- 3. Create Edge Function: supabase/functions/search-tennis-rules
-- ============================================================

-- Example query to verify setup:
-- SELECT * FROM tennis_rules_stats;

-- Example similarity search (after data is loaded):
-- SELECT * FROM match_tennis_rules(
--     query_embedding := (SELECT embedding FROM tennis_rules LIMIT 1),
--     match_threshold := 0.5,
--     match_count := 5,
--     filter_language := 'en'
-- );
