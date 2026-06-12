-- ══════════════════════════════════════════════════════════════════
-- PLAN SNAPSHOTS — Add trabajadera_id for per-trabajadera snapshots
-- ══════════════════════════════════════════════════════════════════

-- Add column with default for existing rows
ALTER TABLE plan_snapshots
  ADD COLUMN IF NOT EXISTS trabajadera_id INTEGER NOT NULL DEFAULT 1;

-- New index for fast filtering by trabajadera
CREATE INDEX IF NOT EXISTS idx_plan_snapshots_trabajadera
  ON plan_snapshots(trabajadera_id, creado_en DESC);

-- Composite index for user + trabajadera queries
CREATE INDEX IF NOT EXISTS idx_plan_snapshots_user_trabajadera
  ON plan_snapshots(user_id, trabajadera_id, creado_en DESC);
