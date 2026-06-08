-- Script para añadir columna puntuacion al censo y actualizar el RPC
-- Ejecutar en Supabase SQL Editor

-- 1. Añadir columna puntuacion a la tabla census
ALTER TABLE census ADD COLUMN IF NOT EXISTS puntuacion INTEGER DEFAULT 0;

-- 2. Actualizar el RPC full_sync_icuadrilla_census para soportar puntuacion
DROP FUNCTION IF EXISTS public.full_sync_icuadrilla_census(text, jsonb);
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
    puntuacion INTEGER;
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
        puntuacion := CASE 
            WHEN r->>'puntuacion' IS NULL or r->>'puntuacion' = '' THEN 0 
            ELSE (r->>'puntuacion')::INTEGER 
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
            puntuacion,
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
