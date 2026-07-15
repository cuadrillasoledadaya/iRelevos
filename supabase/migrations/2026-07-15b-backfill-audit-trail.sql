-- ══════════════════════════════════════════════════════════════════
-- 2026-07-15b — Backfill updated_at for rows that existed before
-- the audit columns were added (commit e96e618, migration
-- 2026-07-15-add-audit-trail.sql).
--
-- Strategy:
--   1. Disable the audit trigger on each table so the UPDATE doesn't
--      overwrite our values with NOW() + auth.uid().
--   2. Copy created_at → updated_at for rows where updated_by IS NULL
--      (i.e., never touched by a real user since the trigger was added).
--   3. Re-enable the trigger.
--
-- updated_by stays NULL for backfilled rows — we don't know who
-- created them historically and the UI handles NULL gracefully.
-- ══════════════════════════════════════════════════════════════════

-- ── census ──
ALTER TABLE census DISABLE TRIGGER trg_census_audit;
UPDATE census
SET updated_at = COALESCE(created_at, updated_at)
WHERE updated_by IS NULL AND created_at IS NOT NULL;
ALTER TABLE census ENABLE TRIGGER trg_census_audit;

-- ── proyectos ──
ALTER TABLE proyectos DISABLE TRIGGER trg_proyectos_audit;
UPDATE proyectos
SET updated_at = COALESCE(created_at, updated_at)
WHERE updated_by IS NULL AND created_at IS NOT NULL;
ALTER TABLE proyectos ENABLE TRIGGER trg_proyectos_audit;

-- ── temporadas ──
ALTER TABLE temporadas DISABLE TRIGGER trg_temporadas_audit;
UPDATE temporadas
SET updated_at = COALESCE(created_at, updated_at)
WHERE updated_by IS NULL AND created_at IS NOT NULL;
ALTER TABLE temporadas ENABLE TRIGGER trg_temporadas_audit;
