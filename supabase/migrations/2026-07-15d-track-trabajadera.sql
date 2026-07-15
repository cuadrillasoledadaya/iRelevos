-- ══════════════════════════════════════════════════════════════════
-- 2026-07-15d — Track which trabajadera changed in plan updates
-- Adds last_changed_trabajadera SMALLINT to proyectos and modifies
-- the trigger to populate it by diffing OLD vs NEW content.
-- Also extends get_last_change() to return a 'detail' column
-- with the trabajadera number when applicable.
-- ══════════════════════════════════════════════════════════════════

-- 1. Add the column
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS last_changed_trabajadera SMALLINT;

-- 2. Replace the trigger function to detect changed trabajadera
CREATE OR REPLACE FUNCTION set_updated_audit()
RETURNS TRIGGER AS $$
DECLARE
  old_trabajaderas jsonb;
  new_trabajaderas jsonb;
  max_i int;
  i int;
  old_t jsonb;
  new_t jsonb;
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();

  -- For proyectos, diff the trabajaderas[] to find which one changed
  IF TG_TABLE_NAME = 'proyectos' THEN
    old_trabajaderas := COALESCE(OLD.content->'trabajaderas', '[]'::jsonb);
    new_trabajaderas := COALESCE(NEW.content->'trabajaderas', '[]'::jsonb);
    max_i := LEAST(
      jsonb_array_length(old_trabajaderas),
      jsonb_array_length(new_trabajaderas)
    );

    FOR i IN 0..(max_i - 1) LOOP
      old_t := old_trabajaderas->i;
      new_t := new_trabajaderas->i;
      IF old_t::text IS DISTINCT FROM new_t::text THEN
        NEW.last_changed_trabajadera := (i + 1);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Replace get_last_change() to add detail column
DROP FUNCTION IF EXISTS get_last_change(INTEGER);

CREATE FUNCTION get_last_change(limit_n INT DEFAULT 1)
RETURNS TABLE(
  section TEXT,
  action TEXT,
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  changed_at TIMESTAMPTZ,
  detail TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH all_changes AS (
    SELECT
      'censo'::TEXT AS section,
      'Censo actualizado'::TEXT AS action,
      c.updated_by AS user_id,
      c.updated_at AS changed_at,
      NULL::TEXT AS detail
    FROM census c WHERE c.updated_by IS NOT NULL

    UNION ALL

    SELECT
      'plan'::TEXT,
      'Plan actualizado'::TEXT,
      p.updated_by,
      p.updated_at,
      CASE
        WHEN p.last_changed_trabajadera IS NOT NULL
        THEN 'trabajadera ' || p.last_changed_trabajadera
        ELSE NULL
      END
    FROM proyectos p WHERE p.updated_by IS NOT NULL

    UNION ALL

    SELECT
      'temporada'::TEXT,
      'Temporada actualizada'::TEXT,
      t.updated_by,
      t.updated_at,
      NULL::TEXT
    FROM temporadas t WHERE t.updated_by IS NOT NULL

    UNION ALL

    SELECT
      'snapshot'::TEXT,
      'Snapshot guardado'::TEXT,
      ps.creado_por,
      ps.creado_en,
      CASE
        WHEN ps.trabajadera_id IS NOT NULL
        THEN 'trabajadera ' || ps.trabajadera_id
        ELSE NULL
      END
    FROM plan_snapshots ps WHERE ps.creado_por IS NOT NULL
  )
  SELECT
    ac.section,
    ac.action,
    ac.user_id,
    COALESCE(pr.nombre || ' ' || COALESCE(pr.apellidos, ''), pr.apodo, 'Usuario desconocido') AS user_name,
    pr.role::TEXT AS user_role,
    ac.changed_at,
    ac.detail
  FROM all_changes ac
  LEFT JOIN profiles pr ON pr.id = ac.user_id
  ORDER BY ac.changed_at DESC
  LIMIT limit_n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_last_change(INT) TO authenticated;
