# 🚀 Guía Rápida - Sistema de Evaluación del Desempeño

## ⚡ Inicio Rápido

### Opción 1: Usar el script automático
```bash
./start_server.sh
```

### Opción 2: Inicio manual
```bash
# 1. Activar entorno virtual
source venv/bin/activate

# 2. Iniciar servidor
python main.py
```

### Opción 3: Primera vez (con datos de ejemplo)
```bash
# 1. Crear entorno virtual (solo primera vez)
python3 -m venv venv

# 2. Activar entorno virtual
source venv/bin/activate

# 3. Instalar dependencias (solo primera vez)
pip install -r requirements.txt

# 4. Crear datos de ejemplo (opcional)
python init_sample_data.py

# 5. Iniciar servidor
python main.py
```

Luego visita: **http://localhost:8000**

---

## 📱 Navegación del Sistema

### 1️⃣ Dashboard
**¿Qué ves aquí?**
- Total de agentes activos
- Total de auditorías realizadas
- Total de feedbacks entregados
- Errores críticos
- Tasa de error promedio
- TNPS general (promotores vs detractores)
- Top 10 agentes con mejor desempeño

**¿Cuándo usarlo?**
- Vista rápida del estado general del equipo
- Identificar tendencias
- Reconocer a los mejores agentes

---

### 2️⃣ Agentes
**¿Qué puedes hacer?**
- ✅ Ver lista de todos los agentes
- ➕ Agregar nuevos agentes
- 📊 Ver desempeño individual de cada agente

**Flujo para agregar un agente:**
1. Click en "Nuevo Agente"
2. Completa: Nombre, Email, Departamento, Cargo
3. Guarda

---

### 3️⃣ Auditorías
**¿Qué puedes hacer?**
- ✅ Ver todas las auditorías de llamadas
- ➕ Registrar nueva auditoría
- 🔍 Filtrar por agente, fecha, criticidad

**Flujo para registrar una auditoría:**
1. Click en "Nueva Auditoría"
2. Completa información de la llamada:
   - Fecha y hora
   - Customer ID
   - Tipo (Tarjeta de Crédito o Cuenta de Ahorros)
   - Agente que atendió
   - Auditor que revisó
3. Completa evaluación:
   - Nivel de criticidad
   - Tipo de error (si aplica)
   - Descripción del error
   - Calificación TNPS del cliente
   - Notas adicionales
4. Guarda

**Niveles de Criticidad:**
- 🟢 **Baja**: Error menor, no afecta significativamente
- 🟡 **Media**: Error moderado, requiere atención
- 🟠 **Alta**: Error importante, afecta experiencia del cliente
- 🔴 **Crítica**: Error grave, riesgo de pérdida de cliente

**TNPS:**
- 💚 **Promoter**: Cliente muy satisfecho (9-10)
- 🟡 **Neutral**: Cliente satisfecho (7-8)
- 🔴 **Detractor**: Cliente insatisfecho (0-6)
- ⚪ **Null**: No respondió encuesta

---

### 4️⃣ Feedbacks
**¿Qué puedes hacer?**
- ✅ Ver todos los feedbacks entregados
- ➕ Registrar nuevo feedback a un agente
- 📊 Analizar impacto del feedback

**Flujo para dar feedback:**
1. Click en "Nuevo Feedback"
2. Selecciona el agente
3. Ingresa fecha del feedback
4. Escribe título (ej: "Mejora en verificación de identidad")
5. Describe el feedback detalladamente
6. Define plan de acción (opcional pero recomendado)
7. Guarda

**Flujo para analizar impacto:**
1. En la lista de feedbacks, busca el feedback que quieres analizar
2. Click en "Analizar"
3. El sistema automáticamente:
   - Cuenta errores 30 días ANTES del feedback
   - Cuenta errores 30 días DESPUÉS del feedback
   - Calcula porcentaje de mejora
   - Muestra si el agente mejoró o empeoró

**Interpretación de resultados:**
- ✅ **+50%**: Excelente mejora
- ✅ **+20% a +49%**: Buena mejora
- 🟡 **0% a +19%**: Leve mejora
- 🔴 **Negativo**: El agente empeoró (requiere más atención)

---

### 5️⃣ Análisis
**¿Qué puedes hacer?**
- 📊 Ver desempeño completo de un agente
- 📈 Analizar distribución de TNPS
- 🔍 Ver tipos de errores más comunes
- 📉 Revisar historial de feedbacks y mejoras

**Flujo de análisis:**
1. Selecciona un agente del dropdown
2. Revisa sus métricas:
   - Total de llamadas atendidas
   - Total de errores cometidos
   - Tasa de error (%)
   - TNPS score
3. Analiza distribución TNPS (gráfico de barras)
4. Revisa tipos de errores más frecuentes
5. Examina feedbacks y su impacto

**¿Cómo identificar agentes que necesitan atención?**
- Tasa de error > 20%
- TNPS negativo
- Muchos errores críticos
- Sin mejora después de feedbacks

**¿Cómo identificar agentes destacados?**
- Tasa de error < 10%
- Alto porcentaje de promotores
- Mejora constante después de feedbacks
- Pocos errores críticos

---

## 🎯 Casos de Uso Comunes

### Caso 1: Reunión Semanal de Desempeño
1. Abre el **Dashboard**
2. Revisa métricas generales
3. Identifica agentes en el Top 10 (reconocerlos)
4. Ve a **Análisis** para revisar agentes con problemas
5. Prepara feedbacks específicos

### Caso 2: Auditar Llamadas del Día
1. Ve a **Auditorías**
2. Click en "Nueva Auditoría" por cada llamada
3. Registra todos los detalles
4. Al final del día, aplica filtros para ver resumen

### Caso 3: Sesión de Feedback con Agente
1. **Antes de la sesión**: Ve a **Análisis**, selecciona el agente
2. Revisa sus métricas y errores comunes
3. **Durante la sesión**: Registra el feedback en **Feedbacks**
4. Define plan de acción específico
5. **30 días después**: Click en "Analizar" para ver mejora

### Caso 4: Reporte Mensual
1. Ve a **Auditorías**, aplica filtro de fecha (último mes)
2. Exporta/revisa datos
3. Ve a **Dashboard** para métricas generales
4. Ve a **Análisis** por cada agente para detalles
5. Identifica tendencias y áreas de mejora del equipo

### Caso 5: Identificar Necesidades de Capacitación
1. Ve a **Análisis**, revisa cada agente
2. En "Errores por Tipo", identifica patrones
3. Si varios agentes tienen el mismo tipo de error:
   → Necesidad de capacitación grupal
4. Si solo un agente tiene muchos errores de un tipo:
   → Necesidad de coaching individual

---

## 💡 Tips y Mejores Prácticas

### ✅ Do's (Hacer)
- Registra auditorías inmediatamente después de revisar la llamada
- Sé específico en las descripciones de errores
- Da feedback constructivo y con plan de acción
- Analiza impacto de feedbacks después de 30 días mínimo
- Revisa el dashboard semanalmente
- Reconoce mejoras de los agentes

### ❌ Don'ts (No hacer)
- No dejes pasar mucho tiempo entre la llamada y su registro
- No uses descripciones genéricas ("mal servicio", "error")
- No des feedback sin plan de acción
- No analices impacto antes de 2-3 semanas (pocos datos)
- No uses solo métricas para evaluar (considera contexto)
- No ignores mejoras pequeñas pero constantes

---

## 🔧 Solución de Problemas

### El servidor no inicia
```bash
# Verifica que el puerto 8000 esté libre
lsof -i :8000

# Si está ocupado, mata el proceso
kill -9 [PID]

# O inicia en otro puerto editando main.py
```

### Error de módulos no encontrados
```bash
# Activa el entorno virtual primero
source venv/bin/activate

# Reinstala dependencias
pip install -r requirements.txt
```

### La base de datos está vacía
```bash
# Crea datos de ejemplo
python init_sample_data.py
```

### Quiero empezar de cero
```bash
# Elimina la base de datos
rm performance_evaluation.db

# Crea nueva con datos de ejemplo (opcional)
python init_sample_data.py
```

---

## 📞 Preguntas Frecuentes

**P: ¿Puedo cambiar el periodo de análisis de feedbacks?**
R: Sí, el análisis por defecto es 30 días antes/después. Puedes modificarlo en el código (`main.py`, función `analyze_feedback_impact`).

**P: ¿Cómo exporto los datos?**
R: Actualmente no hay función de exportación integrada. Los datos están en `performance_evaluation.db` (SQLite). Puedes usar herramientas como DB Browser for SQLite.

**P: ¿Puedo usar esto en producción?**
R: El sistema está listo para uso interno. Para producción externa, considera:
- Migrar a PostgreSQL
- Agregar autenticación (JWT/OAuth)
- Implementar HTTPS
- Agregar backups automáticos

**P: ¿Cuántos usuarios soporta?**
R: Con SQLite, puede manejar 10-20 usuarios concurrentes sin problemas. Para más usuarios, migra a PostgreSQL.

**P: ¿Cómo agrego más auditores?**
R: Actualmente no hay interfaz. Puedes:
1. Usar la API directamente
2. O agregar código en `init_sample_data.py` y ejecutarlo

---

## 🎓 Próximos Pasos

Una vez que domines el sistema básico, considera:
1. Personalizar tipos de errores para tu organización
2. Agregar más niveles de criticidad si es necesario
3. Definir metas de desempeño por agente/equipo
4. Crear reportes personalizados
5. Integrar con otros sistemas (CRM, telefonía)

---

**¡Feliz análisis de desempeño! 🚀**

