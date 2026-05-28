-- Agregar columna rol a la tabla census
-- Ejecutar en Supabase SQL Editor

-- Agregar columna rol como enum rol_code (puede ser null para registros existentes)
ALTER TABLE census ADD COLUMN rol TEXT CHECK (rol IN ('PAT_D', 'PAT_I', 'COS_D', 'COS_I', 'FIJ_D', 'FIJ_I', 'COR'));

-- Actualizar registros existentes con rol por defecto (COR)
UPDATE census SET rol = 'COR' WHERE rol IS NULL AND source = 'manual';

-- Comentario: Los roles importados desde iCuadrilla tendrán su rol asignado durante la importación.
-- Los costaleros sin rol (null) usarán los roles por defecto de defaultRoles() en tiempo de ejecución.