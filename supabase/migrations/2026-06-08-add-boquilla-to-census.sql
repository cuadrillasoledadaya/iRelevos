-- Script para añadir columna boquilla al censo
-- Ejecutar en Supabase SQL Editor

ALTER TABLE census ADD COLUMN IF NOT EXISTS boquilla BOOLEAN DEFAULT false;
