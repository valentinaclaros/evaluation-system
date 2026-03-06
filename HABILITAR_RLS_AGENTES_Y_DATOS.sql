-- ============================================
-- HABILITAR GUARDAR AGENTES Y DATOS
-- Ejecuta este script en Supabase: SQL Editor → New query → Pegar → Run
-- ============================================
-- Sin estas políticas, no se pueden registrar agentes ni guardar auditorías/feedbacks.

-- 1. Tabla AGENTS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for agents" ON agents;
CREATE POLICY "Allow all for agents" ON agents
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Tabla AUDITS
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for audits" ON audits;
CREATE POLICY "Allow all for audits" ON audits
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Tabla FEEDBACKS (por si no existe la política)
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Enable all access for feedbacks" ON feedbacks;
CREATE POLICY "Allow all for feedbacks" ON feedbacks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Tabla STRIKES (para que no falle al guardar feedbacks con strikes)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'strikes') THEN
        ALTER TABLE strikes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all for strikes" ON strikes;
        CREATE POLICY "Allow all for strikes" ON strikes
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Confirmación
SELECT 'Políticas RLS aplicadas. Ya puedes registrar agentes y guardar datos.' AS resultado;
