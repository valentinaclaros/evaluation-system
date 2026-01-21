# Guía: Conectar Twilio con Databricks para Auditorías de Llamadas

## 📋 Requisitos Previos

- Acceso a cuenta de Twilio
- Acceso a Databricks con permisos para crear Secrets
- Permisos para instalar librerías en el cluster

---

## PASO 1: Obtener Credenciales de Twilio

### 1.1 Accede a la Consola de Twilio
1. Ve a: https://console.twilio.com/
2. Inicia sesión con tu cuenta

### 1.2 Obtén tus credenciales
En el Dashboard principal encontrarás:
- **Account SID** (ejemplo: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
- **Auth Token** (haz clic en "Show" para verlo)

**⚠️ IMPORTANTE:** Guarda estas credenciales en un lugar seguro temporalmente.

---

## PASO 2: Configurar Databricks Secrets

Los Secrets mantienen tus credenciales seguras y no expuestas en el código.

### 2.1 Crear Secret Scope (Si no existe)

**Opción A: Vía Databricks CLI (Recomendado)**
```bash
# Instalar Databricks CLI
pip install databricks-cli

# Configurar autenticación
databricks configure --token

# Crear el secret scope
databricks secrets create-scope --scope twilio-secrets
```

**Opción B: Vía UI de Databricks**
1. Ve a: `https://<tu-workspace>.cloud.databricks.com/#secrets/createScope`
2. Nombre del scope: `twilio-secrets`
3. Manage Principal: `All Users` (o según tu política)

### 2.2 Agregar los Secrets

```bash
# Agregar Account SID
databricks secrets put --scope twilio-secrets --key account-sid

# Agregar Auth Token
databricks secrets put --scope twilio-secrets --key auth-token
```

**✅ Verificar:**
```bash
databricks secrets list --scope twilio-secrets
```

Deberías ver:
- account-sid
- auth-token

---

## PASO 3: Instalar Librería de Twilio en Databricks

### 3.1 En tu Cluster:
1. Ve a **Clusters** → Selecciona tu cluster
2. Clic en **Libraries** → **Install New**
3. Selecciona **PyPI**
4. Package name: `twilio`
5. Clic en **Install**

### 3.2 También instalar (opcional pero recomendado):
- `azure-cognitiveservices-speech` (para transcripciones)
- `textblob` (para análisis de sentimiento)

---

## PASO 4: Crear Notebook en Databricks

Usa los archivos que te proporcioné:
- `twilio_connection.py` - Para conectar y extraer datos
- `call_transcription.py` - Para transcribir llamadas
- `call_audit_analysis.py` - Para análisis y auditoría

---

## PASO 5: Configuración de Azure Speech (Para Transcripciones)

### 5.1 Crear recurso de Azure Speech
1. Ve a Azure Portal
2. Busca "Speech Services"
3. Crear nuevo recurso
4. Copia la **Key** y **Region**

### 5.2 Agregar a Databricks Secrets
```bash
databricks secrets put --scope twilio-secrets --key azure-speech-key
databricks secrets put --scope twilio-secrets --key azure-speech-region
```

---

## 🎯 Flujo Completo de Trabajo

```
1. Twilio API → Extrae metadata de llamadas
              ↓
2. Descarga grabaciones de audio
              ↓
3. Azure Speech → Transcribe audio a texto
              ↓
4. Databricks → Análisis y auditoría
              ↓
5. Guarda resultados → Delta Table o Google Sheets
              ↓
6. Dashboard → Visualización en Looker/Power BI
```

---

## 📊 Estructura de Tablas Sugerida

### Tabla: `call_recordings`
```sql
CREATE TABLE IF NOT EXISTS call_recordings (
  call_sid STRING,
  call_date TIMESTAMP,
  agent STRING,
  customer_id STRING,
  phone_from STRING,
  phone_to STRING,
  duration_seconds INT,
  recording_url STRING,
  status STRING,
  created_at TIMESTAMP
)
```

### Tabla: `call_transcriptions`
```sql
CREATE TABLE IF NOT EXISTS call_transcriptions (
  call_sid STRING,
  transcription TEXT,
  confidence_score FLOAT,
  language STRING,
  transcribed_at TIMESTAMP
)
```

### Tabla: `call_audits`
```sql
CREATE TABLE IF NOT EXISTS call_audits (
  call_sid STRING,
  agent STRING,
  audit_date TIMESTAMP,
  saludo_correcto BOOLEAN,
  ofrece_ayuda BOOLEAN,
  despedida_correcta BOOLEAN,
  palabras_prohibidas ARRAY<STRING>,
  sentiment_score FLOAT,
  quality_score INT,
  issues ARRAY<STRING>,
  needs_review BOOLEAN
)
```

---

## 🚀 Automatización

### Crear Job Diario en Databricks:
1. **Jobs** → **Create Job**
2. **Task:**
   - Tipo: Notebook
   - Path: tu notebook principal
   - Cluster: selecciona uno existente
3. **Schedule:**
   - Frequency: Daily
   - Time: 06:00 AM
4. **Notifications:**
   - Email en caso de fallo

---

## 📞 Soporte

Si tienes dudas:
- Documentación Twilio API: https://www.twilio.com/docs/voice
- Databricks Secrets: https://docs.databricks.com/security/secrets/index.html
- Azure Speech: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/

---

## ⚠️ Consideraciones de Seguridad

1. **NUNCA** pongas credenciales directamente en el código
2. Usa **Databricks Secrets** para toda información sensible
3. Limita el acceso al Secret Scope solo a usuarios autorizados
4. Rota las credenciales regularmente
5. Audita el acceso a las grabaciones (datos sensibles de clientes)

---

## 💰 Consideraciones de Costos

- **Twilio:** Cobra por minuto de grabación y almacenamiento
- **Azure Speech:** Cobra por hora de audio transcrito
- **Databricks:** Considera el uso de clusters autoscaling

**Tip:** Empieza con un piloto de 1 semana de llamadas para estimar costos.

