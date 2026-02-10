-- ============================================================
-- Phase 2: Update metadata for existing 155 Korean records
-- ============================================================
-- Run this in Supabase SQL Editor (one-time execution)
--
-- Purpose: Fill NULL metadata JSONB for all existing records
-- with language, source_version, section_type, and original_len
-- ============================================================

-- Preview before update (optional - comment out for actual run)
-- SELECT
--   id,
--   rule_id,
--   LEFT(content, 50) AS content_preview,
--   metadata
-- FROM tennis_rules
-- WHERE metadata IS NULL
-- ORDER BY id
-- LIMIT 10;

-- Update metadata for all records with NULL metadata
UPDATE tennis_rules
SET metadata = jsonb_build_object(
  'language', 'ko',
  'source_version', 'KTA 2020.11.20',
  'original_len', length(content),
  'section_type', CASE
    WHEN rule_id = 'Foreword/Intro' THEN 'foreword'
    WHEN rule_id ~ '^\d+\.' THEN 'rule'
    WHEN rule_id ~ '^[a-zA-Z]\.' THEN 'sub-section'
    WHEN rule_id ~ '^(부록|Appendix|[IVX]+\.)' THEN 'appendix'
    ELSE 'other'
  END
)
WHERE metadata IS NULL;

-- Verify the update
SELECT
  metadata->>'section_type' AS section_type,
  COUNT(*) AS count,
  ROUND(AVG((metadata->>'original_len')::int)) AS avg_len
FROM tennis_rules
WHERE metadata IS NOT NULL
GROUP BY metadata->>'section_type'
ORDER BY count DESC;

-- ============================================================
-- Expected output (approximately):
--   section_type | count | avg_len
--   rule         |   ~31 |    ~XXX
--   sub-section  |   ~XX |    ~XXX
--   appendix     |    ~X |    ~XXX
--   foreword     |     1 |    ~XXX
--   other        |    ~X |    ~XXX
-- ============================================================
