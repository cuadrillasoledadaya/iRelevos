-- ══════════════════════════════════════════════════════════════════
-- 2026-07-15 — Audit trail for "último cambio" dashboard widget
-- Adds updated_at + updated_by + auto-fills via trigger from auth.uid()
-- No service code changes needed — trigger handles everything
-- ══════════════════════════════════════════════════════════════════

-- 1. Add columns to the 3 main mutable tables
ALTER TABLE census
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE temporadas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 2. Generic function: auto-set updated_at + updated_by from auth.uid()
CREATE OR REPLACE FUNCTION set_updated_audit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on INSERT/UPDATE for the 3 tables
DROP TRIGGER IF EXISTS trg_census_audit ON census;
CREATE TRIGGER trg_census_audit
  BEFORE INSERT OR UPDATE ON census
  FOR EACH ROW EXECUTE FUNCTION set_updated_audit();

DROP TRIGGER IF EXISTS trg_proyectos_audit ON proyectos;
CREATE TRIGGER trg_proyectos_audit
  BEFORE INSERT OR UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION set_updated_audit();

DROP TRIGGER IF EXISTS trg_temporadas_audit ON temporadas;
CREATE TRIGGER trg_temporadas_audit
  BEFORE INSERT OR UPDATE ON temporadas
  FOR EACH ROW EXECUTE FUNCTION set_updated_audit();

-- 4. RPC: get the most recent change across all 4 audited tables
--    Returns 0 or 1 row with unified shape for the dashboard widget.
CREATE OR REPLACE FUNCTION get_last_change()
RETURNS TABLE(
  section TEXT,
  action TEXT,
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  changed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH all_changes AS (
    -- Census changes
    SELECT
      'censo'::TEXT AS section,
      'Censo actualizado'::TEXT AS action,
      c.updated_by AS user_id,
      c.updated_at AS changed_at
    FROM census c
    WHERE c.updated_by IS NOT NULL

    UNION ALL

    -- Project/plan changes
    SELECT
      'plan'::TEXT,
      'Plan actualizado'::TEXT,
      p.updated_by,
      p.updated_at
    FROM proyectos p
    WHERE p.updated_by IS NOT NULL

    UNION ALL

    -- Season changes
    SELECT
      'temporada'::TEXT,
      'Temporada actualizada'::TEXT,
      t.updated_by,
      t.updated_at
    FROM temporadas t
    WHERE t.updated_by IS NOT NULL

    UNION ALL

    -- Plan snapshots (use user_id FK, not creado_por which is TEXT)
    SELECT
      'snapshot'::TEXT,
      'Snapshot de plan guardado'::TEXT,
      ps.user_id,
      ps.creado_en
    FROM plan_snapshots ps
    WHERE ps.user_id IS NOT NULL
  )
  SELECT
    ac.section,
    ac.action,
    ac.user_id,
    COALESCE(pr.nombre || ' ' || COALESCE(pr.apellidos, ''), pr.apodo, 'Usuario desconocido') AS user_name,
    pr.role::TEXT,
    ac.changed_at
  FROM all_changes ac
  LEFT JOIN profiles pr ON pr.id = ac.user_id
  ORDER BY ac.changed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Grant execute on the RPC to authenticated users
GRANT EXECUTE ON FUNCTION get_last_change() TO authenticated;
