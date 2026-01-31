-- =====================================================
-- CREAR TABLA DE STRIKES EN SUPABASE
-- =====================================================
-- Ejecuta este código en el SQL Editor de Supabase

-- Crear tabla de strikes
CREATE TABLE IF NOT EXISTS strikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    project TEXT NOT NULL,
    strike_level INTEGER NOT NULL CHECK (strike_level BETWEEN 1 AND 3),
    feedback_id UUID,
    feedback_description TEXT,
    aplica_matriz TEXT CHECK (aplica_matriz IN ('Si', 'No')),
    accionable TEXT CHECK (accionable IN (
        'Advertencia verbal',
        'Advertencia escrita',
        'Terminación',
        'Citación a descargos'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_strikes_agent_id ON strikes(agent_id);
CREATE INDEX IF NOT EXISTS idx_strikes_project ON strikes(project);
CREATE INDEX IF NOT EXISTS idx_strikes_strike_level ON strikes(strike_level);
CREATE INDEX IF NOT EXISTS idx_strikes_feedback_id ON strikes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_strikes_created_at ON strikes(created_at DESC);

-- Deshabilitar RLS (Row Level Security) para simplificar
ALTER TABLE strikes DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- NOTA: Después de ejecutar este script:
-- 1. Verifica que la tabla se creó correctamente
-- 2. El sistema generará strikes automáticamente cuando
--    se registren feedbacks con matriz disciplinaria
-- =====================================================
