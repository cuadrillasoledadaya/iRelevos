-- ══════════════════════════════════════════════════════════════════
-- 2026-11-03 — El censo importado de iCuadrilla necesita temporada_id
--
-- Bug: el RPC `full_sync_icuadrilla_census` insertaba los costaleros
-- SIN rellenar `census.temporada_id` (la columna quedaba NULL).
--
-- Síntoma: después de importar, los costaleros NO aparecían en el
-- "Censo de Cuadrilla" de la app ni se cargaban sus apodos/alturas,
-- porque esas consultas filtraban por `temporada_id`. El capataz
-- veía la cuadrilla (eso lo hace `syncTodoCenso`, que filtra por
-- `proyecto_id`) pero el censo de la app salía vacío, y poner un
-- apodo no se propagaba a las cuadrillas.
--
-- Fix (este script):
--   1) El RPC pasa a rellenar `temporada_id` con la del proyecto.
--   2) Backfill de las filas existentes que lo tienen a NULL.
--
-- Nota: la app (src/app/api/import-costaleros/route.ts) ya hace este
-- backfill con el service role después de cada importación, para que
-- funcione sin aplicar este script. Este script es el "fix de fondo".
-- ══════════════════════════════════════════════════════════════════

-- ── 1) RPC con temporada_id ──────────────────────────────────────

DROP FUNCTION IF EXISTS public.full_sync_icuadrilla_census(uuid, jsonb);

CREATE OR REPLACE FUNCTION full_sync_icuadrilla_census(
    p_proyecto_id UUID,
    p_records JSONB
)
RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
    inserted_count INTEGER;
    r JSONB;
    external_id TEXT;
    nombre TEXT;
    apellidos TEXT;
    apodo TEXT;
    email TEXT;
    trabajadera INTEGER;
    rol TEXT;
    rol_sec TEXT;
    puntuacion NUMERIC;
    temporada_id UUID;
BEGIN
    -- Temporada del proyecto (para no dejar el censo con temporada_id NULL)
    SELECT t.id INTO temporada_id
    FROM public.proyectos p
    JOIN public.temporadas t ON t.id = p.temporada_id
    WHERE p.id = p_proyecto_id;

    -- Eliminar registros existentes del proyecto con source='icuadrilla'
    DELETE FROM census
    WHERE proyecto_id = p_proyecto_id
    AND source = 'icuadrilla';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Insertar nuevos registros
    FOR r IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        external_id := r->>'external_id';
        nombre := r->>'nombre';
        apellidos := r->>'apellidos';
        apodo := r->>'apodo';
        email := r->>'email';
        trabajadera := CASE
            WHEN r->>'trabajadera' IS NULL or r->>'trabajadora' = '' THEN NULL
            ELSE (r->>'trabajadera')::INTEGER
        END;
        rol := r->>'rol';
        rol_sec := r->>'rol_sec';
        puntuacion := CASE
            WHEN r->>'puntuacion' IS NULL or r->>'puntuacion' = '' THEN 0
            ELSE (r->>'puntuacion')::NUMERIC
        END;

        INSERT INTO census (
            external_id,
            nombre,
            apellidos,
            apodo,
            email,
            trabajadera,
            rol,
            rol_sec,
            puntuacion,
            source,
            proyecto_id,
            temporada_id
        ) VALUES (
            external_id,
            nombre,
            apellidos,
            apodo,
            email,
            trabajadera,
            rol,
            rol_sec,
            puntuacion,
            'icuadrilla',
            p_proyecto_id,
            temporada_id
        );
    END LOOP;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'deleted', deleted_count,
        'inserted', inserted_count
    );
END;
$$ LANGUAGE plpgsql;

-- ── 2) Backfill de las filas existentes ───────────────────────────

UPDATE public.census c
SET temporada_id = p.temporada_id
FROM public.proyectos p
WHERE c.proyecto_id = p.id
  AND c.temporada_id IS NULL
  AND p.temporada_id IS NOT NULL;
