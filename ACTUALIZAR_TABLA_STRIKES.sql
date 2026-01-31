-- =====================================================
-- ACTUALIZAR TABLA DE STRIKES EN SUPABASE
-- =====================================================
-- Ejecuta este código en el SQL Editor de Supabase

-- Agregar columnas adicionales a la tabla strikes
ALTER TABLE strikes 
ADD COLUMN IF NOT EXISTS tipo_feedback TEXT,
ADD COLUMN IF NOT EXISTS channel TEXT,
ADD COLUMN IF NOT EXISTS owner TEXT;

-- =====================================================
-- NOTA: Después de ejecutar este script, recarga tu aplicación
-- =====================================================
