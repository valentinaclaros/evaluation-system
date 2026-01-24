// ===================================
// Configuración de Supabase
// ===================================

const SUPABASE_URL = 'https://fbudeufxxsrwhnmontcj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZidWRldWZ4eHNyd2hubW9udGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzAyOTQsImV4cCI6MjA4NDg0NjI5NH0.7CbZgIpe8f5oUWwcMI2lQqmt2h9DS5iPZmJatMQi5lM';

// Verificar que el SDK se haya cargado
if (typeof window.supabase === 'undefined') {
    console.error('❌ Error: Supabase SDK no se cargó. Verifica la conexión a internet.');
} else {
    console.log('✅ SDK de Supabase detectado');
}

// Crear cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Cliente de Supabase inicializado');
console.log('URL:', SUPABASE_URL);
