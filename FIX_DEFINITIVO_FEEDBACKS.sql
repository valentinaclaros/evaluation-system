-- =====================================================
-- FIX DEFINITIVO: CAMBIAR AGENT_ID A TEXT EN FEEDBACKS
-- =====================================================
-- Ejecuta este código en el SQL Editor de Supabase

-- Cambiar el tipo de columna agent_id de UUID a TEXT
ALTER TABLE feedbacks 
ALTER COLUMN agent_id TYPE TEXT;

-- Configurar auto-generación de ID
ALTER TABLE feedbacks 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- =====================================================
-- Después de ejecutar esto, recarga tu aplicación
-- Ahora SÍ debería funcionar correctamente
-- =====================================================
