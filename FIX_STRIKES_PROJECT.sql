-- =====================================================
-- FIX FINAL: QUITAR RESTRICCIÓN DE PROJECT EN STRIKES
-- =====================================================
-- Ejecuta este código en el SQL Editor de Supabase

-- Hacer que la columna project sea opcional (nullable)
ALTER TABLE strikes 
ALTER COLUMN project DROP NOT NULL;

-- =====================================================
-- LISTO! Recarga con Ctrl+Shift+R
-- =====================================================
