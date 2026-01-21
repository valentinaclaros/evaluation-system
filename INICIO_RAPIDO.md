# 🚀 Inicio Rápido: Twilio + Databricks para Auditorías

Esta guía te llevará de 0 a tener auditorías automatizadas de llamadas en **menos de 1 hora**.

---

## ✅ Checklist de Prerrequisitos

Antes de empezar, verifica que tienes:

- [ ] Acceso a Twilio con permisos de API
- [ ] Acceso a Databricks con permisos para crear notebooks y secrets
- [ ] Python 3.8+ instalado en tu computadora local
- [ ] (Opcional) Azure Speech Services para transcripciones

---

## 📋 Pasos Rápidos

### PASO 1: Obtén tus credenciales de Twilio (5 min)

1. Ve a https://console.twilio.com/
2. Copia tu **Account SID** (empieza con `AC...`)
3. Copia tu **Auth Token** (haz clic en "Show")
4. Guárdalos temporalmente en un lugar seguro

### PASO 2: Configura Databricks Secrets (10 min)

**Opción A: Con script automático (Recomendado)**
```bash
# En tu terminal
cd /Users/valentina.claros/Desktop/Query
chmod +x setup_databricks_secrets.sh
./setup_databricks_secrets.sh
```

**Opción B: Manualmente**
```bash
# Instalar Databricks CLI
pip install databricks-cli

# Configurar
databricks configure --token

# Crear scope
databricks secrets create-scope --scope twilio-secrets

# Agregar secrets
databricks secrets put --scope twilio-secrets --key account-sid
databricks secrets put --scope twilio-secrets --key auth-token
```

### PASO 3: Sube los notebooks a Databricks (5 min)

1. Ve a tu workspace de Databricks
2. Navega a tu carpeta de notebooks
3. Sube estos archivos:
   - `twilio_connection.py`
   - `call_transcription.py`
   - `call_audit_analysis.py`

### PASO 4: Instala librerías en tu cluster (5 min)

1. Ve a **Clusters** → Tu cluster → **Libraries**
2. Instala estas librerías PyPI:
   - `twilio`
   - `azure-cognitiveservices-speech` (opcional)
   - `textblob`
   - `vaderSentiment`

### PASO 5: Ejecuta el primer notebook (10 min)

1. Abre `twilio_connection.py` en Databricks
2. Haz clic en **"Run All"**
3. Verifica que los datos se carguen correctamente

**Resultado esperado:**
- Tabla creada: `usr.co-cx-ops-analytics.twilio_calls`
- Tabla creada: `usr.co-cx-ops-analytics.twilio_recordings`

### PASO 6: (Opcional) Transcribe llamadas (20 min)

**Solo si tienes Azure Speech configurado:**

1. Obtén tu Azure Speech Key y Region
2. Agrégalos a secrets:
   ```bash
   databricks secrets put --scope twilio-secrets --key azure-speech-key
   databricks secrets put --scope twilio-secrets --key azure-speech-region
   ```
3. Ejecuta `call_transcription.py`

**Resultado esperado:**
- Tabla creada: `usr.co-cx-ops-analytics.twilio_transcriptions`

### PASO 7: Audita llamadas (10 min)

1. Abre `call_audit_analysis.py`
2. Ejecuta el notebook
3. Revisa las métricas de calidad

**Resultado esperado:**
- Tabla creada: `usr.co-cx-ops-analytics.twilio_call_audits`
- Dashboard con métricas de calidad

---

## 📊 ¿Qué obtienes?

### Tablas creadas:

1. **`twilio_calls`** - Metadata de todas las llamadas
2. **`twilio_recordings`** - URLs y metadata de grabaciones
3. **`twilio_transcriptions`** - Texto transcrito de las llamadas
4. **`twilio_call_audits`** - Análisis de calidad automatizado

### Métricas disponibles:

- ✅ **Protocolo de atención:**
  - Saludo correcto
  - Identificación del agente
  - Ofrecimiento de ayuda
  - Despedida apropiada

- 📊 **Análisis de calidad:**
  - Quality Score (0-100)
  - Análisis de sentimiento
  - Detección de palabras prohibidas
  - Duración de llamada

- 🚨 **Alertas:**
  - Llamadas que requieren revisión manual
  - Palabras prohibidas detectadas
  - Sentimiento negativo

---

## 🔄 Automatización

### Crear Job diario:

1. Ve a **Workflows** → **Create Job**
2. Configura:
   - **Name:** "Auditoría Diaria de Llamadas"
   - **Task 1:** `twilio_connection.py`
   - **Task 2:** `call_transcription.py` (depende de Task 1)
   - **Task 3:** `call_audit_analysis.py` (depende de Task 2)
3. **Schedule:** Daily at 06:00 AM
4. **Notifications:** Tu email para errores

---

## 📈 Queries útiles

### Ver llamadas auditadas hoy:
```sql
SELECT 
    call_sid,
    quality_score,
    quality_category,
    needs_manual_review
FROM usr.`co-cx-ops-analytics`.twilio_call_audits
WHERE DATE(start_time) = CURRENT_DATE()
ORDER BY quality_score ASC
```

### Estadísticas semanales:
```sql
SELECT 
    quality_category,
    COUNT(*) as total,
    ROUND(AVG(quality_score), 2) as score_promedio
FROM usr.`co-cx-ops-analytics`.twilio_call_audits
WHERE start_time >= CURRENT_DATE() - INTERVAL 7 DAYS
GROUP BY quality_category
```

### Palabras prohibidas más comunes:
```sql
SELECT 
    exploded_word,
    COUNT(*) as veces
FROM usr.`co-cx-ops-analytics`.twilio_call_audits
LATERAL VIEW explode(forbidden_words) AS exploded_word
GROUP BY exploded_word
ORDER BY veces DESC
```

---

## 🆘 Solución de Problemas

### Error: "Secret not found"
```bash
# Verifica que los secrets existan
databricks secrets list --scope twilio-secrets

# Si no existe, créalo
databricks secrets put --scope twilio-secrets --key account-sid
```

### Error: "Module 'twilio' not found"
```python
# Ejecuta esto en una celda del notebook
%pip install twilio
dbutils.library.restartPython()
```

### Error: "Table not found"
- Verifica que hayas ejecutado el notebook anterior primero
- Las tablas se crean en orden: calls → recordings → transcriptions → audits

### Transcripciones vacías:
- Verifica que Azure Speech esté configurado correctamente
- Verifica que las grabaciones existan en Twilio
- Revisa los logs del notebook de transcripción

---

## 💡 Tips y Mejores Prácticas

1. **Empieza pequeño:** Prueba con 10-20 llamadas antes de procesar miles
2. **Costos:** Las transcripciones con Azure tienen costo. Estima primero.
3. **Privacidad:** Las grabaciones contienen datos sensibles. Limita el acceso.
4. **Alertas:** Configura notificaciones para quality_score < 40
5. **Feedback:** Comparte los resultados con los agentes para mejora continua

---

## 📞 Próximos Pasos

Una vez que tengas todo funcionando:

1. **Integra con tu CRM:** Conecta los call_sid con tus datos de clientes
2. **Dashboard en Looker:** Crea visualizaciones para el equipo
3. **Exporta a Sheets:** Usa el proceso que ya conoces para reportes
4. **NPS Prediction:** Usa sentiment_score para predecir NPS
5. **Coaching automático:** Genera feedback personalizado por agente

---

## 📚 Documentación Completa

- Guía detallada: `twilio_databricks_setup.md`
- Notebooks:
  - `twilio_connection.py` - Extracción de datos
  - `call_transcription.py` - Transcripción
  - `call_audit_analysis.py` - Análisis y auditoría

---

## ✅ Checklist Final

Cuando termines, deberías tener:

- [ ] Secrets configurados en Databricks
- [ ] 4 tablas creadas en `usr.co-cx-ops-analytics`
- [ ] Notebooks ejecutándose sin errores
- [ ] Métricas de calidad visibles
- [ ] Job programado para ejecución diaria

---

**¿Necesitas ayuda?** Revisa los logs de los notebooks o consulta la documentación detallada.

**¡Listo para auditar llamadas automáticamente! 🎉**

