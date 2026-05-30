-- Script para actualizar la función RPC full_sync_icuadrilla_census con soporte rol_sec
-- Ejecutar en Supabase SQL Editor

-- Eliminar todas las versiones existentes de la función
DROP FUNCTION IF EXISTS public.full_sync_icuadrilla_census(text, jsonb);
DROP FUNCTION IF EXISTS public.full_sync_icuadrilla_census(uuid, jsonb);

-- Crear la versión actualizada con rol_sec
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
BEGIN
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
            WHEN r->>'trabajadera' IS NULL or r->>'trabajadera' = '' THEN NULL 
            ELSE (r->>'trabajadera')::INTEGER 
        END;
        rol := r->>'rol';
        rol_sec := r->>'rol_sec';
        
        INSERT INTO census (
            external_id, 
            nombre, 
            apellidos, 
            apodo, 
            email, 
            trabajadera,
            rol,
            rol_sec,
            source,
            proyecto_id
        ) VALUES (
            external_id, 
            nombre, 
            apellidos, 
            apodo, 
            email, 
            trabajadera,
            rol,
            rol_sec,
            'icuadrilla',
            p_proyecto_id
        );
    END LOOP;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'deleted', deleted_count,
        'inserted', inserted_count
    );
END;
$$ LANGUAGE plpgsql;

-- Nota: Esta función ahora soporta rol_sec (rol secundario) además del rol principal.