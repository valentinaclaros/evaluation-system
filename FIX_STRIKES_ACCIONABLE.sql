-- =====================================================
-- FIX: QUITAR RESTRICCIÓN DE ACCIONABLE EN STRIKES
-- =====================================================
-- Ejecuta este código en el SQL Editor de Supabase

-- Quitar la restricción de accionable
ALTER TABLE strikes 
DROP CONSTRAINT IF EXISTS strikes_accionable_check;

-- =====================================================
-- LISTO! Recarga con Ctrl+Shift+R
-- =====================================================
