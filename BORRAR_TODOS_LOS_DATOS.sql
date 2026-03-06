-- ============================================
-- BORRAR TODOS LOS DATOS EN SUPABASE
-- Auditorías, agentes, feedbacks, strikes: todo a cero
-- ============================================
-- Cómo ejecutarlo:
-- 1. Entra en https://supabase.com → tu proyecto
-- 2. Menú izquierdo: SQL Editor
-- 3. New query
-- 4. Pega todo este contenido y pulsa Run (o Ctrl+Enter)
-- Las tablas quedan vacías; la estructura se mantiene.

-- Orden: primero tablas que referencian a otras
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'strikes') THEN
        DELETE FROM strikes;
    END IF;
END $$;

DELETE FROM feedbacks;
DELETE FROM audits;
DELETE FROM agents;

SELECT 'Listo. Todos los datos borrados (auditorías, agentes, feedbacks, strikes).' AS resultado;
