-- ══════════════════════════════════════════════════════════════════
-- 2026-07-15f — Fix UNION type mismatch in get_last_change()
-- The audit columns (census.updated_by, proyectos.updated_by,
-- temporadas.updated_by) are UUID, but plan_snapshots.creado_por
-- is TEXT (a display name, not a FK). PostgreSQL can't UNION
-- UUID with TEXT, so the function errors with 42804.
--
-- Fix: change the function's user_id return type to TEXT and
-- cast the UUID columns to TEXT for the UNION. Adjust the
-- profiles JOIN to compare TEXT = TEXT.
-- ══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_last_change();
DROP FUNCTION IF EXISTS get_last_change(INTEGER);

CREATE FUNCTION get_last_change(limit_n INT DEFAULT 1)
RETURNS TABLE(
  section TEXT,
  action TEXT,
  user_id TEXT,
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
      c.updated_by::TEXT AS user_id,
      c.updated_at AS changed_at,
      NULL::TEXT AS detail
    FROM census c

    UNION ALL

    SELECT
      'plan'::TEXT,
      'Plan actualizado'::TEXT,
      p.updated_by::TEXT,
      p.updated_at,
      CASE
        WHEN p.last_changed_trabajadera IS NOT NULL
        THEN 'trabajadera ' || p.last_changed_trabajadera
        ELSE NULL
      END
    FROM proyectos p

    UNION ALL

    SELECT
      'temporada'::TEXT,
      'Temporada actualizada'::TEXT,
      t.updated_by::TEXT,
      t.updated_at,
      NULL::TEXT
    FROM temporadas t

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
    FROM plan_snapshots ps
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
  LEFT JOIN profiles pr ON pr.id::text = ac.user_id
  ORDER BY ac.changed_at DESC
  LIMIT limit_n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_last_change(INT) TO authenticated;
