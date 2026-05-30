-- Agregar columna rol_sec (rol secundario) a la tabla census
-- Ejecutar en Supabase SQL Editor

-- Agregar columna rol_sec como texto con check de valores válidos
ALTER TABLE census ADD COLUMN rol_sec TEXT CHECK (rol_sec IN ('PAT_D', 'PAT_I', 'COS_D', 'COS_I', 'FIJ_D', 'FIJ_I', 'COR'));

-- Actualizar registros existentes con rol_sec por defecto (FIJ_I)
UPDATE census SET rol_sec = 'FIJ_I' WHERE rol_sec IS NULL AND source = 'manual';

-- Comentario: El rol secundario importado desde iCuadrilla tendrá su rol_sec asignado durante la importación.