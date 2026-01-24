-- ============================================
-- SCRIPT COMPLETO PARA ARREGLAR BASE DE DATOS
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- 1. Eliminar tabla feedbacks y recrearla con TODAS las columnas
DROP TABLE IF EXISTS feedbacks CASCADE;

CREATE TABLE feedbacks (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    feedback_date DATE NOT NULL,
    feedback_type TEXT NOT NULL,
    feedback_process TEXT,
    additional_steps TEXT,
    priority TEXT NOT NULL,
    feedback_message TEXT NOT NULL,
    feedback_given_by TEXT NOT NULL,
    action_plan TEXT,
    follow_up_date DATE,
    related_calls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejor performance
CREATE INDEX idx_feedbacks_agent_id ON feedbacks(agent_id);
CREATE INDEX idx_feedbacks_date ON feedbacks(feedback_date);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 4. Crear política para acceso total (temporal, para desarrollo)
CREATE POLICY "Enable all access for feedbacks" ON feedbacks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Verificar estructura final
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'feedbacks'
ORDER BY ordinal_position;

-- 6. Mensaje de confirmación
SELECT 'Tabla feedbacks recreada correctamente con todas las columnas' AS status;
