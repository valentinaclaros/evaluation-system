-- =====================================================
-- AGREGAR COLUMNA TIPO_CANCELACION A STRIKES
-- =====================================================
-- Ejecuta este código en el SQL Editor de Supabase

-- Agregar columna tipo_cancelacion a strikes
ALTER TABLE strikes 
ADD COLUMN IF NOT EXISTS tipo_cancelacion TEXT;

-- =====================================================
-- LISTO! Recarga con Ctrl+Shift+R
-- =====================================================
