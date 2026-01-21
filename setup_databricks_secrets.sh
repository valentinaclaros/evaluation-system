#!/bin/bash

# Script para configurar Databricks Secrets
# Este script te ayuda a configurar las credenciales de forma segura

echo "======================================"
echo "🔐 Configuración de Databricks Secrets"
echo "======================================"
echo ""

# Verificar si Databricks CLI está instalado
if ! command -v databricks &> /dev/null; then
    echo "⚠️  Databricks CLI no está instalado"
    echo ""
    echo "Para instalarlo, ejecuta:"
    echo "  pip install databricks-cli"
    echo ""
    exit 1
fi

echo "✅ Databricks CLI está instalado"
echo ""

# Configurar autenticación
echo "📝 Configuración de autenticación"
echo ""
echo "Necesitarás:"
echo "  1. URL de tu workspace (ej: https://xxx.cloud.databricks.com)"
echo "  2. Un Personal Access Token"
echo ""
echo "Para obtener tu token:"
echo "  1. Ve a tu workspace de Databricks"
echo "  2. User Settings → Access Tokens → Generate New Token"
echo ""

read -p "¿Ya tienes estos datos? (y/n): " ready

if [ "$ready" != "y" ]; then
    echo ""
    echo "Por favor obtén tus credenciales primero y vuelve a ejecutar este script."
    exit 0
fi

echo ""
echo "Configurando Databricks CLI..."
databricks configure --token

echo ""
echo "======================================"
echo "📦 Creando Secret Scope"
echo "======================================"
echo ""

# Crear el secret scope
echo "Creando scope 'twilio-secrets'..."
databricks secrets create-scope --scope twilio-secrets 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Scope 'twilio-secrets' creado"
else
    echo "ℹ️  El scope 'twilio-secrets' ya existe (esto es normal)"
fi

echo ""
echo "======================================"
echo "🔑 Agregando Secrets"
echo "======================================"
echo ""

# Función para agregar un secret
add_secret() {
    local key=$1
    local description=$2
    
    echo "📌 $description"
    echo "Ingresa el valor (no se mostrará en pantalla):"
    read -s value
    
    if [ -z "$value" ]; then
        echo "⚠️  Valor vacío, omitiendo..."
        return
    fi
    
    echo "$value" | databricks secrets put --scope twilio-secrets --key "$key"
    
    if [ $? -eq 0 ]; then
        echo "✅ Secret '$key' agregado exitosamente"
    else
        echo "❌ Error agregando secret '$key'"
    fi
    echo ""
}

# Agregar secrets de Twilio
echo "🔸 CREDENCIALES DE TWILIO"
echo ""
add_secret "account-sid" "Twilio Account SID (empieza con AC...)"
add_secret "auth-token" "Twilio Auth Token"

echo ""
echo "🔸 CREDENCIALES DE AZURE SPEECH (Opcional - para transcripciones)"
echo ""
read -p "¿Deseas configurar Azure Speech ahora? (y/n): " setup_azure

if [ "$setup_azure" = "y" ]; then
    add_secret "azure-speech-key" "Azure Speech Service Key"
    add_secret "azure-speech-region" "Azure Speech Region (ej: eastus)"
fi

echo ""
echo "======================================"
echo "✅ Configuración completada"
echo "======================================"
echo ""
echo "Para verificar tus secrets:"
echo "  databricks secrets list --scope twilio-secrets"
echo ""
echo "Próximos pasos:"
echo "  1. Sube los notebooks a Databricks"
echo "  2. Ejecuta el notebook de conexión: twilio_connection.py"
echo "  3. Ejecuta el notebook de transcripción: call_transcription.py"
echo "  4. Ejecuta el notebook de auditoría: call_audit_analysis.py"
echo ""
echo "¡Listo para empezar! 🚀"

