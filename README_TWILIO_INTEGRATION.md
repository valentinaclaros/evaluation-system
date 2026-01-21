# 🎙️ Integración Twilio + Databricks para Auditorías de Llamadas

Sistema completo para extraer, transcribir y auditar llamadas automáticamente usando Twilio y Databricks.

---

## 📁 Estructura del Proyecto

```
Query/
├── 📘 INICIO_RAPIDO.md                    ← EMPIEZA AQUÍ
├── 📖 twilio_databricks_setup.md          ← Guía detallada completa
├── 📖 README_TWILIO_INTEGRATION.md        ← Este archivo
│
├── 🔧 setup_databricks_secrets.sh         ← Script de configuración
│
├── 📓 twilio_connection.py                ← Notebook 1: Extrae datos de Twilio
├── 📓 call_transcription.py               ← Notebook 2: Transcribe llamadas
├── 📓 call_audit_analysis.py              ← Notebook 3: Análisis y auditoría
│
├── 📊 modified_query.sql                  ← Query de TNPS Nu Plus
└── 📊 embargo_query.sql                   ← Query de embargos/cancelaciones
```

---

## 🚀 Inicio Rápido (5 minutos de lectura)

### ¿Qué hace este sistema?

1. **Extrae** llamadas desde Twilio automáticamente
2. **Transcribe** el audio a texto (usando Azure Speech)
3. **Analiza** la calidad de la atención
4. **Detecta** problemas y genera alertas
5. **Califica** cada llamada con un score de 0-100

### ¿Para qué sirve?

- ✅ Auditar calidad de atención de call centers (Konecta, Teleperformance)
- ✅ Detectar si los agentes siguen el protocolo
- ✅ Identificar uso de palabras prohibidas
- ✅ Analizar sentimiento del cliente
- ✅ Generar reportes automáticos de calidad

---

## 📚 Documentación

### 1. Para Comenzar
- **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)** - Guía paso a paso para implementar en menos de 1 hora

### 2. Documentación Completa
- **[twilio_databricks_setup.md](twilio_databricks_setup.md)** - Guía técnica detallada con todas las configuraciones

### 3. Notebooks
- **[twilio_connection.py](twilio_connection.py)** - Extrae datos de llamadas y grabaciones
- **[call_transcription.py](call_transcription.py)** - Transcribe audio a texto
- **[call_audit_analysis.py](call_audit_analysis.py)** - Analiza calidad y genera métricas

### 4. Scripts
- **[setup_databricks_secrets.sh](setup_databricks_secrets.sh)** - Automatiza configuración de credenciales

---

## 🎯 Casos de Uso

### 1. Auditoría de Protocolo de Atención
```sql
-- Ver agentes que NO están saludando correctamente
SELECT 
    agent,
    COUNT(*) as llamadas_sin_saludo,
    AVG(quality_score) as score_promedio
FROM twilio_call_audits
WHERE has_greeting = FALSE
    AND DATE(start_time) >= CURRENT_DATE() - INTERVAL 7 DAYS
GROUP BY agent
ORDER BY llamadas_sin_saludo DESC
```

### 2. Detección de Palabras Prohibidas
```sql
-- Top palabras prohibidas por agente
SELECT 
    agent,
    exploded_word as palabra,
    COUNT(*) as veces
FROM twilio_call_audits
LATERAL VIEW explode(forbidden_words) AS exploded_word
GROUP BY agent, exploded_word
ORDER BY veces DESC
```

### 3. Llamadas que Requieren Revisión
```sql
-- Llamadas críticas del día
SELECT 
    call_sid,
    quality_score,
    forbidden_words,
    sentiment_score,
    needs_manual_review
FROM twilio_call_audits
WHERE needs_manual_review = TRUE
    AND DATE(start_time) = CURRENT_DATE()
ORDER BY quality_score ASC
```

### 4. Tendencias de Calidad
```sql
-- Score de calidad por día
SELECT 
    DATE(start_time) as fecha,
    AVG(quality_score) as score_promedio,
    COUNT(*) as total_llamadas,
    COUNT(CASE WHEN quality_score < 50 THEN 1 END) as llamadas_problema
FROM twilio_call_audits
WHERE start_time >= CURRENT_DATE() - INTERVAL 30 DAYS
GROUP BY DATE(start_time)
ORDER BY fecha DESC
```

---

## 📊 Tablas Generadas

### `usr.co-cx-ops-analytics.twilio_calls`
Metadata de todas las llamadas extraídas de Twilio.

**Columnas principales:**
- `call_sid` - ID único de la llamada
- `from_number` - Teléfono del cliente
- `start_time` - Fecha/hora de inicio
- `duration_seconds` - Duración en segundos
- `status` - Estado de la llamada

### `usr.co-cx-ops-analytics.twilio_recordings`
URLs y metadata de las grabaciones.

**Columnas principales:**
- `recording_sid` - ID de la grabación
- `call_sid` - ID de la llamada asociada
- `recording_url` - URL para descargar el audio
- `duration` - Duración de la grabación

### `usr.co-cx-ops-analytics.twilio_transcriptions`
Texto transcrito de cada grabación.

**Columnas principales:**
- `recording_sid` - ID de la grabación
- `call_sid` - ID de la llamada
- `transcription` - Texto completo transcrito
- `confidence_score` - Nivel de confianza (0-1)

### `usr.co-cx-ops-analytics.twilio_call_audits`
Análisis de calidad de cada llamada.

**Columnas principales:**
- `call_sid` - ID de la llamada
- `has_greeting` - ¿Saludó correctamente?
- `has_identification` - ¿Se identificó el agente?
- `has_help_offer` - ¿Ofreció ayuda?
- `has_farewell` - ¿Despedida apropiada?
- `forbidden_words` - Lista de palabras prohibidas detectadas
- `sentiment_score` - Score de sentimiento (-1 a 1)
- `quality_score` - Puntaje de calidad (0-100)
- `quality_category` - Excelente / Buena / Regular / Requiere Atención
- `needs_manual_review` - ¿Requiere revisión manual?

---

## 🔐 Seguridad y Mejores Prácticas

### ✅ Hacer:
- Usar Databricks Secrets para todas las credenciales
- Limitar acceso a las tablas de transcripciones (datos sensibles)
- Auditar quién accede a las grabaciones
- Rotar credenciales regularmente
- Anonimizar números de teléfono en reportes públicos

### ❌ No Hacer:
- Poner credenciales directamente en el código
- Compartir transcripciones por email
- Dar acceso abierto a las grabaciones
- Almacenar transcripciones sin cifrar
- Exponer números de teléfono completos

---

## 💰 Consideraciones de Costos

### Twilio:
- **Grabaciones:** ~$0.0025 USD por minuto
- **Almacenamiento:** ~$0.05 USD por GB/mes
- **Ejemplo:** 1000 llamadas de 5 min = ~$12.50 USD/mes

### Azure Speech:
- **Transcripción:** ~$1 USD por hora de audio
- **Ejemplo:** 1000 llamadas de 5 min = ~83 horas = ~$83 USD/mes

### Databricks:
- **Compute:** Depende del cluster usado
- **Storage:** Delta Tables incluidas en tu plan
- **Tip:** Usa autoscaling para optimizar costos

### 💡 Recomendación:
Empieza con un piloto de 1 semana (~200 llamadas) para validar costos antes de escalar.

---

## 🔄 Automatización

### Job Recomendado (Ejecutar Diariamente):

```
🕐 06:00 AM (Colombia Time)

Task 1: twilio_connection.py
  ├── Extrae llamadas del día anterior
  └── Guarda en twilio_calls y twilio_recordings
  
Task 2: call_transcription.py (depende de Task 1)
  ├── Transcribe grabaciones nuevas
  └── Guarda en twilio_transcriptions
  
Task 3: call_audit_analysis.py (depende de Task 2)
  ├── Analiza calidad
  ├── Genera métricas
  └── Guarda en twilio_call_audits
  
Task 4: send_alerts.py (opcional)
  └── Envía email con llamadas que requieren revisión
```

### Configuración en Databricks:
1. **Workflows** → **Create Job**
2. Nombra: "Auditoría Diaria Twilio"
3. Agrega las 3 tasks en orden
4. Schedule: Cron `0 6 * * *` (6 AM diario)
5. Notifications: Tu email en caso de error

---

## 📈 Métricas de Éxito

### KPIs Sugeridos:

1. **Quality Score Promedio:** Objetivo > 75
2. **% Llamadas con saludo correcto:** Objetivo > 95%
3. **% Llamadas con palabras prohibidas:** Objetivo < 5%
4. **Sentiment Score Promedio:** Objetivo > 0.3
5. **% Llamadas que requieren revisión:** Objetivo < 10%

### Dashboard Sugerido (Looker/Power BI):

- 📊 Tendencia de Quality Score (últimos 30 días)
- 📉 % Cumplimiento de protocolo por agente
- 🚨 Alertas de llamadas críticas (score < 40)
- 💬 Word Cloud de palabras prohibidas
- 📞 Distribución de duración de llamadas
- 😊 Análisis de sentimiento por día/semana

---

## 🆘 Soporte y Troubleshooting

### Problemas Comunes:

#### 1. "Secret not found"
```bash
databricks secrets list --scope twilio-secrets
# Si está vacío, ejecuta setup_databricks_secrets.sh
```

#### 2. "No data in tables"
- Verifica fechas en el WHERE del notebook
- Confirma que tienes llamadas en Twilio en ese rango
- Revisa los logs del notebook

#### 3. "Transcription failed"
- Verifica Azure Speech credentials
- Confirma que la grabación existe y es accesible
- Revisa el formato del audio (debe ser mp3/wav)

#### 4. "Quality score siempre 0"
- Verifica que las transcripciones no estén vacías
- Revisa las funciones de análisis (puede necesitar ajuste de frases)
- Confirma el idioma configurado (es-CO)

---

## 🔮 Próximas Mejoras

### Features Planeados:
- [ ] Análisis por agente individual
- [ ] Predicción de NPS basado en transcripción
- [ ] Identificación automática de temas/problemas
- [ ] Recomendaciones de coaching por agente
- [ ] Integración con sistema de tickets
- [ ] Dashboard en tiempo real
- [ ] Alertas por Slack/Teams

### Contribuciones:
Si tienes ideas o mejoras, documéntalas y compártelas con el equipo.

---

## 📞 Contacto y Recursos

### Documentación Oficial:
- **Twilio API:** https://www.twilio.com/docs/voice
- **Databricks:** https://docs.databricks.com/
- **Azure Speech:** https://learn.microsoft.com/azure/cognitive-services/speech-service/

### Recursos Internos:
- **Confluence:** Página del proyecto CX Analytics
- **Slack:** Canal #cx-analytics-co
- **Email:** Equipo de CX Ops Analytics

---

## ✅ Checklist de Implementación

### Fase 1: Setup (1 hora)
- [ ] Obtener credenciales de Twilio
- [ ] Configurar Databricks Secrets
- [ ] Instalar librerías en cluster
- [ ] Subir notebooks a Databricks

### Fase 2: Pruebas (2 horas)
- [ ] Ejecutar twilio_connection.py con 10 llamadas
- [ ] Verificar datos en twilio_calls
- [ ] Ejecutar call_transcription.py (si tienes Azure)
- [ ] Ejecutar call_audit_analysis.py
- [ ] Revisar métricas generadas

### Fase 3: Producción (30 min)
- [ ] Configurar Job automatizado
- [ ] Probar ejecución programada
- [ ] Configurar alertas
- [ ] Documentar proceso para el equipo

### Fase 4: Optimización (ongoing)
- [ ] Ajustar criterios de auditoría según feedback
- [ ] Crear dashboard en Looker/Power BI
- [ ] Integrar con otras herramientas
- [ ] Entrenar al equipo en el uso del sistema

---

**🎉 ¡Todo listo para auditar llamadas automáticamente!**

Para comenzar, abre **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)** y sigue los pasos.

