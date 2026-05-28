-- Script para actualizar la función RPC full_sync_icuadrilla_census
-- Ejecutar en Supabase SQL Editor

-- Eliminar todas las versiones existentes de la función
DROP FUNCTION IF EXISTS public.full_sync_icuadrilla_census(text, jsonb);
DROP FUNCTION IF EXISTS public.full_sync_icuadrilla_census(uuid, jsonb);

-- Crear la versión correcta (usa UUID para proyecto_id)
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
        
        INSERT INTO census (
            external_id, 
            nombre, 
            apellidos, 
            apodo, 
            email, 
            trabajadera,
            rol,
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

-- Nota: Si la función ya existe y tiene otro parámetro de entrada (como p_records como json en lugar de jsonb),
-- ajústalo según sea necesario. El tipo de dato debe coincidir con cómo se llama desde la API.