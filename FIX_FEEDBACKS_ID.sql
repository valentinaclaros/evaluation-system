-- =====================================================
-- CONFIGURAR AUTO-GENERACIÓN DE ID EN TABLA FEEDBACKS
-- =====================================================
-- Ejecuta este código en el SQL Editor de Supabase

-- Configurar que la columna ID se genere automáticamente
ALTER TABLE feedbacks 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- =====================================================
-- Después de ejecutar esto, recarga tu aplicación
-- =====================================================
