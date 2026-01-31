-- =====================================================
-- FIX COMPLETO: ARREGLAR TODAS LAS TABLAS
-- =====================================================
-- COPIA TODO ESTO Y EJECUTALO EN SUPABASE SQL EDITOR
-- =====================================================

-- 1. Arreglar tabla FEEDBACKS
ALTER TABLE feedbacks 
ALTER COLUMN agent_id TYPE TEXT;

ALTER TABLE feedbacks 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Arreglar tabla STRIKES
ALTER TABLE strikes 
ALTER COLUMN agent_id TYPE TEXT;

ALTER TABLE strikes 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Agregar columnas faltantes a STRIKES
ALTER TABLE strikes 
ADD COLUMN IF NOT EXISTS tipo_feedback TEXT,
ADD COLUMN IF NOT EXISTS channel TEXT,
ADD COLUMN IF NOT EXISTS owner TEXT;

-- =====================================================
-- LISTO! Ahora recarga tu aplicación con Ctrl+Shift+R
-- =====================================================
