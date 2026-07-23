-- ══════════════════════════════════════════════════════════════════
-- 2026-07-23 — Fix census global-unique constraints to per-proyecto
--
-- Bug: census.external_id and census.email had GLOBAL unique
-- constraints, but the same iCuadrilla costalero can legitimately
-- belong to multiple proyectos (e.g., one project per temporada).
-- When a new temporada was created and the import was re-run against
-- a new proyecto, the INSERT in full_sync_icuadrilla_census violated
-- the global uniqueness for any costalero whose external_id or email
-- was already in the table from a previous temporada's proyecto.
--
-- Symptom: POST /api/import-costaleros returned 500 with
--   duplicate key value violates unique constraint "idx_census_external_id"
--   duplicate key value violates unique constraint "idx_census_email_unique"
--
-- Fix: replace each global unique index with a composite unique index
-- on (proyecto_id, column). A costalero is unique WITHIN a proyecto.
-- The same iCuadrilla person can exist in many proyectos.
--
-- Hotfix was applied manually to production on 2026-07-23; this file
-- documents the change for future re-deploys and for environments that
-- need to be brought into parity.
-- ══════════════════════════════════════════════════════════════════

-- ── external_id ──────────────────────────────────────────────────

-- 1. Drop the global unique index
DROP INDEX IF EXISTS public.idx_census_external_id;

-- 2. Create a composite unique index, partial (NULL external_ids are
--    manual entries; multiple manual entries per proyecto are fine)
CREATE UNIQUE INDEX IF NOT EXISTS idx_census_proyecto_external_id
  ON public.census (proyecto_id, external_id)
  WHERE external_id IS NOT NULL;

-- ── email ────────────────────────────────────────────────────────

-- 1. Drop the global unique index
DROP INDEX IF EXISTS public.idx_census_email_unique;

-- 2. Create a composite unique index, preserving the original WHERE
--    clause semantics: ignore NULL and empty-string emails (the
--    original index already had this partial filter)
CREATE UNIQUE INDEX IF NOT EXISTS idx_census_proyecto_email
  ON public.census (proyecto_id, email)
  WHERE email IS NOT NULL AND email <> '';
