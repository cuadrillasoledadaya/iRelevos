-- ══════════════════════════════════════════════════════════════════
-- PLAN SNAPSHOTS — Table for plan history (plan-history slice 1)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS plan_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id         UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  temporada_id        UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trabajadera_id      INTEGER NOT NULL DEFAULT 1,
  nombre              TEXT NOT NULL,
  descripcion         TEXT,
  snapshot            JSONB NOT NULL,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por          TEXT
);

-- Indices for fast listing and filtering
CREATE INDEX IF NOT EXISTS idx_plan_snapshots_user_created
  ON plan_snapshots(user_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_plan_snapshots_proyecto
  ON plan_snapshots(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_plan_snapshots_temporada
  ON plan_snapshots(temporada_id);

-- RLS: owner-only access
ALTER TABLE plan_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_only_plan_snapshots" ON plan_snapshots;
CREATE POLICY "owner_only_plan_snapshots"
  ON plan_snapshots
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
