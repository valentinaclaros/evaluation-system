#!/bin/bash

# Script para iniciar el servidor del Sistema de Evaluación del Desempeño

echo "🚀 Iniciando Sistema de Evaluación del Desempeño..."
echo ""

# Verificar si existe el entorno virtual
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
    echo "✅ Entorno virtual creado"
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias si es necesario
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Instalando dependencias..."
    pip install -r requirements.txt
    echo "✅ Dependencias instaladas"
fi

# Verificar si existe la base de datos
if [ ! -f "performance_evaluation.db" ]; then
    echo "💾 Base de datos no encontrada. ¿Deseas crear datos de ejemplo? (s/n)"
    read -r response
    if [ "$response" = "s" ] || [ "$response" = "S" ]; then
        python init_sample_data.py
    fi
fi

echo ""
echo "================================================================"
echo "✅ Servidor iniciado exitosamente!"
echo "================================================================"
echo ""
echo "📱 Accede al sistema en: http://localhost:8000"
echo ""
echo "⚠️  Para detener el servidor, presiona CTRL+C"
echo ""

# Iniciar servidor
python main.py

