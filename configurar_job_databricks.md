# 🔄 Guía: Configurar Job Automatizado en Databricks

Esta guía te muestra paso a paso cómo configurar un Job en Databricks para que ejecute automáticamente la auditoría de llamadas cada día.

---

## 📋 Prerrequisitos

Antes de configurar el Job, asegúrate de tener:

- ✅ Los 3 notebooks subidos a Databricks:
  - `twilio_connection.py`
  - `call_transcription.py`
  - `call_audit_analysis.py`
  
- ✅ Un cluster configurado con las librerías instaladas:
  - `twilio`
  - `azure-cognitiveservices-speech`
  - `textblob`
  
- ✅ Secrets configurados en `twilio-secrets` scope

- ✅ Los notebooks ejecutados manualmente al menos una vez exitosamente

---

## 🚀 Paso a Paso

### PASO 1: Acceder a Workflows

1. En Databricks, ve al menú lateral izquierdo
2. Haz clic en **"Workflows"** (icono de engranajes conectados)
3. Haz clic en el botón azul **"Create Job"** (arriba a la derecha)

---

### PASO 2: Configuración Básica del Job

#### 2.1 Nombre del Job

En el campo **"Job name"** escribe:
```
Auditoría Diaria de Llamadas Twilio
```

#### 2.2 Descripción (Opcional)

En el campo de descripción puedes agregar:
```
Job automatizado que extrae llamadas de Twilio, las transcribe y genera métricas de auditoría de calidad.
Ejecuta diariamente a las 6:00 AM (Colombia).
```

---

### PASO 3: Configurar Task 1 - Extracción de Datos

#### 3.1 Crear la primera tarea

1. Haz clic en **"+ Add task"** o usa la tarea vacía que aparece por defecto
2. En **"Task name"** escribe: `1_extraer_llamadas_twilio`

#### 3.2 Configurar el notebook

1. **Type:** Selecciona **"Notebook"**
2. **Source:** Selecciona **"Workspace"**
3. **Path:** Haz clic en el selector de archivos y navega hasta tu notebook `twilio_connection`
4. Haz clic en **"Select"**

#### 3.3 Configurar el cluster

1. En la sección **"Cluster"**, tienes dos opciones:

   **Opción A: Usar cluster existente (Recomendado si tienes uno)**
   - Selecciona **"Existing cluster"**
   - Elige tu cluster del dropdown
   
   **Opción B: Crear job cluster (Recomendado para producción)**
   - Selecciona **"New job cluster"**
   - Configuración sugerida:
     - **Cluster mode:** Standard
     - **Databricks runtime version:** Selecciona la más reciente LTS (ej: 13.3 LTS)
     - **Node type:** Standard_DS3_v2 o el más económico disponible
     - **Workers:** 
       - Min: 1
       - Max: 2
       - Enable autoscaling: ✅
     - **Advanced options** → **Environment Variables:**
       - Nada por ahora, las credenciales están en Secrets

2. Haz clic en **"Confirm"** o **"Create"**

#### 3.4 Guardar la tarea

Haz clic en **"Create task"** o **"Save"**

---

### PASO 4: Configurar Task 2 - Transcripción

#### 4.1 Agregar segunda tarea

1. Haz clic en el botón **"+ Add task"** (abajo de la tarea anterior)
2. **Task name:** `2_transcribir_llamadas`

#### 4.2 Configurar dependencia

1. En la sección **"Depends on"** verás la opción de agregar dependencias
2. Selecciona: `1_extraer_llamadas_twilio`
3. Esto asegura que Task 2 solo se ejecute si Task 1 termina exitosamente

#### 4.3 Configurar el notebook

1. **Type:** Notebook
2. **Source:** Workspace
3. **Path:** Selecciona `call_transcription`

#### 4.4 Configurar cluster

- Usa el mismo cluster que Task 1 (se compartirá automáticamente)

#### 4.5 Guardar

Haz clic en **"Create task"**

---

### PASO 5: Configurar Task 3 - Auditoría

#### 5.1 Agregar tercera tarea

1. Haz clic en **"+ Add task"**
2. **Task name:** `3_auditar_calidad`

#### 5.2 Configurar dependencia

1. **Depends on:** Selecciona `2_transcribir_llamadas`

#### 5.3 Configurar el notebook

1. **Type:** Notebook
2. **Source:** Workspace
3. **Path:** Selecciona `call_audit_analysis`

#### 5.4 Guardar

Haz clic en **"Create task"**

---

### PASO 6: Configurar Schedule (Programación)

#### 6.1 Ir a la pestaña Schedule

1. En la parte superior del Job, verás pestañas: **Tasks**, **Schedule**, **Runs**, etc.
2. Haz clic en la pestaña **"Schedule"**

#### 6.2 Activar schedule

1. Haz clic en el toggle **"Add schedule"** o **"Add trigger"**
2. Se abrirá un formulario

#### 6.3 Configurar horario

**Opción A: Modo Simple (Recomendado para empezar)**

1. **Trigger type:** Schedule
2. **Schedule type:** **"Scheduled"**
3. Configura:
   - **Every:** Day
   - **At:** 06:00 (6:00 AM)
   - **Timezone:** America/Bogota (o America/Mexico_City según tu zona)
4. **Pause status:** Leave ACTIVE (sin pausar)

**Opción B: Cron Syntax (Para usuarios avanzados)**

1. Selecciona **"Cron"**
2. Expresión cron para diario 6 AM:
   ```
   0 6 * * *
   ```
3. **Timezone:** America/Bogota

#### 6.4 Guardar schedule

Haz clic en **"Save"** o **"Add"**

---

### PASO 7: Configurar Notificaciones (Importante)

#### 7.1 Ir a la pestaña Notifications

1. En la parte superior, haz clic en la pestaña **"Notifications"** o **"Alerts"**

#### 7.2 Agregar email para errores

1. Haz clic en **"Add notification"**
2. Configura:
   - **When:** On failure (cuando falle)
   - **Destination type:** Email
   - **Recipients:** Tu email (ej: valentina.claros@nu.com.co)
3. Opcional: Agrega notificación para éxito también

#### 7.3 Guardar

Haz clic en **"Save"**

---

### PASO 8: Probar el Job Manualmente

Antes de esperar a que se ejecute automáticamente, pruébalo manualmente:

#### 8.1 Ejecutar ahora

1. En la parte superior derecha del Job, haz clic en **"Run now"**
2. Se abrirá una vista de la ejecución en progreso

#### 8.2 Monitorear ejecución

1. Verás las 3 tareas ejecutándose en secuencia
2. Cada tarea mostrará:
   - ⏳ Running (ejecutándose)
   - ✅ Succeeded (exitosa)
   - ❌ Failed (falló)

#### 8.3 Revisar logs si hay errores

Si alguna tarea falla:
1. Haz clic en la tarea que falló
2. Haz clic en **"View run details"**
3. Revisa los logs para identificar el error

---

### PASO 9: Verificar Programación

#### 9.1 Confirmar siguiente ejecución

1. Ve a la pestaña **"Runs"**
2. En la parte superior verás: **"Next run scheduled at: [fecha y hora]"**
3. Confirma que sea 6:00 AM del día siguiente

#### 9.2 Vista de Jobs activos

1. Ve a **Workflows** en el menú lateral
2. Verás tu Job listado con un indicador verde (Active)
3. Muestra la última ejecución y la próxima programada

---

## 🎯 Configuración Avanzada (Opcional)

### Parámetros del Job

Si quieres hacer el Job más flexible:

1. Ve a cada Task
2. En **"Parameters"** puedes agregar:
   ```json
   {
     "start_date": "{{job.start_time.iso_date}}",
     "end_date": "{{job.end_time.iso_date}}"
   }
   ```
3. Usa estos parámetros en tus notebooks con:
   ```python
   dbutils.widgets.get("start_date")
   ```

### Timeout

Para evitar que el Job se ejecute indefinidamente:

1. En cada Task → **Advanced** → **Timeout**
2. Configura: `3600` segundos (1 hora)

### Retry en caso de fallo

1. En cada Task → **Advanced** → **Retries**
2. **Max retries:** 2
3. **Retry interval:** 300 segundos (5 minutos)

### Concurrencia

1. En la configuración general del Job
2. **Max concurrent runs:** 1 (para evitar ejecuciones simultáneas)

---

## ✅ Checklist de Validación

Después de configurar, verifica:

- [ ] El Job aparece en la lista de Workflows
- [ ] El schedule está activo (toggle verde)
- [ ] Las 3 tasks están en orden correcto: 1 → 2 → 3
- [ ] Cada task tiene el notebook correcto asignado
- [ ] Las dependencias están configuradas (Task 2 depende de Task 1, etc.)
- [ ] El cluster está configurado y disponible
- [ ] Las notificaciones por email están configuradas
- [ ] La prueba manual se ejecutó exitosamente
- [ ] La próxima ejecución está programada para 6:00 AM

---

## 📊 Monitoreo Continuo

### Revisar ejecuciones pasadas:

1. Ve a **Workflows** → Tu Job → Pestaña **"Runs"**
2. Verás un historial de todas las ejecuciones
3. Puedes filtrar por: Success, Failed, Running

### Métricas útiles:

- **Success rate:** % de ejecuciones exitosas
- **Average duration:** Tiempo promedio de ejecución
- **Last run status:** Estado de la última ejecución

### Alertas recomendadas:

Configura alertas adicionales si:
- El Job tarda más de 2 horas (posible problema)
- Falla 2 días consecutivos
- No se ejecuta en el horario esperado

---

## 🆘 Troubleshooting

### El Job no se ejecuta automáticamente

**Posibles causas:**
1. El schedule está pausado → Ve a Schedule y activa el toggle
2. La zona horaria es incorrecta → Verifica America/Bogota
3. El cluster se apagó → Asegúrate de que el cluster esté disponible

### La Task 1 falla con "Secret not found"

**Solución:**
```bash
databricks secrets list --scope twilio-secrets
# Verifica que existan: account-sid y auth-token
```

### La Task 2 falla en transcripción

**Solución:**
- Verifica que Azure Speech secrets estén configurados
- Confirma que hay grabaciones en la tabla `twilio_recordings`

### El Job se ejecuta pero no genera datos

**Solución:**
- Revisa los logs de cada task
- Verifica las fechas en los WHEREs de las queries
- Confirma que hay llamadas en Twilio en ese rango

---

## 📈 Optimizaciones

### Para ahorrar costos:

1. **Apaga el cluster cuando no se use:**
   - Usa "New job cluster" en lugar de cluster existente
   - El cluster se creará solo para el Job y se apagará al terminar

2. **Ajusta el tamaño del cluster:**
   - Si procesas < 1000 llamadas/día, 1-2 workers es suficiente

3. **Optimiza las queries:**
   - Agrega filtros de fecha en los notebooks
   - Procesa solo llamadas del día anterior

### Para mejorar velocidad:

1. **Usa autoscaling:**
   - Min: 1 worker
   - Max: 4 workers (solo para picos)

2. **Partitiona las tablas:**
   ```python
   df.write.partitionBy("date").saveAsTable(...)
   ```

3. **Cachea DataFrames grandes:**
   ```python
   df_calls.cache()
   ```

---

## ✅ Job Configurado Exitosamente

Tu Job ahora:
- ✅ Se ejecuta automáticamente cada día a las 6:00 AM
- ✅ Extrae llamadas nuevas de Twilio
- ✅ Las transcribe y analiza
- ✅ Genera métricas de calidad
- ✅ Te notifica por email si hay problemas

**🎉 ¡Felicidades! Tu sistema de auditorías está completamente automatizado.**

---

## 📞 Próximos Pasos

1. Monitorea las primeras ejecuciones durante una semana
2. Ajusta los criterios de auditoría según necesites
3. Crea un dashboard en Looker con las métricas
4. Comparte los resultados con tu equipo
5. Exporta reportes a Google Sheets semanalmente

---

**¿Necesitas ayuda?** Revisa los logs del Job o consulta la documentación completa en `README_TWILIO_INTEGRATION.md`

