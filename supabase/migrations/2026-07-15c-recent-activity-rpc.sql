-- ══════════════════════════════════════════════════════════════════
-- 2026-07-15c — Parameterize get_last_change() with limit_n
-- so the same RPC can serve the single-row widget and the
-- activity feed (multiple rows).
-- ══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_last_change();

CREATE FUNCTION get_last_change(limit_n INT DEFAULT 1)
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
    SELECT 'censo'::TEXT AS section, 'Censo actualizado'::TEXT AS action,
           c.updated_by AS user_id, c.updated_at AS changed_at
    FROM census c WHERE c.updated_by IS NOT NULL
    UNION ALL
    SELECT 'plan', 'Plan actualizado', p.updated_by, p.updated_at
    FROM proyectos p WHERE p.updated_by IS NOT NULL
    UNION ALL
    SELECT 'temporada', 'Temporada actualizada', t.updated_by, t.updated_at
    FROM temporadas t WHERE t.updated_by IS NOT NULL
    UNION ALL
    SELECT 'snapshot', 'Snapshot de plan guardado', ps.user_id, ps.creado_en
    FROM plan_snapshots ps WHERE ps.user_id IS NOT NULL
  )
  SELECT
    ac.section,
    ac.action,
    ac.user_id,
    COALESCE(pr.nombre || ' ' || COALESCE(pr.apellidos, ''), pr.apodo, 'Usuario desconocido') AS user_name,
    pr.role::TEXT AS user_role,
    ac.changed_at
  FROM all_changes ac
  LEFT JOIN profiles pr ON pr.id = ac.user_id
  ORDER BY ac.changed_at DESC
  LIMIT limit_n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_last_change(INT) TO authenticated;
