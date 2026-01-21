# Databricks notebook source
# MAGIC %md
# MAGIC # Análisis y Auditoría Automatizada de Llamadas
# MAGIC 
# MAGIC Este notebook analiza las transcripciones de llamadas y genera métricas de calidad.
# MAGIC 
# MAGIC **Criterios de auditoría:**
# MAGIC - ✅ Saludo correcto
# MAGIC - ✅ Identificación del agente
# MAGIC - ✅ Ofrecimiento de ayuda
# MAGIC - ✅ Despedida apropiada
# MAGIC - ❌ Detección de palabras prohibidas
# MAGIC - 📊 Análisis de sentimiento
# MAGIC - ⏱️ Duración apropiada

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Instalación de librerías

# COMMAND ----------

# %pip install textblob
# %pip install vaderSentiment

# COMMAND ----------

from pyspark.sql.functions import *
from pyspark.sql.types import *
from textblob import TextBlob
import re
from datetime import datetime, timedelta

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Cargar datos de transcripciones

# COMMAND ----------

# Query para obtener todas las transcripciones con metadata
df_transcriptions = spark.sql("""
    SELECT 
        c.call_sid,
        c.from_number,
        c.to_number,
        c.start_time,
        c.duration_seconds,
        c.status as call_status,
        t.transcription,
        t.confidence_score,
        t.transcribed_at
    FROM usr.`co-cx-ops-analytics`.twilio_calls c
    INNER JOIN usr.`co-cx-ops-analytics`.twilio_recordings r
        ON c.call_sid = r.call_sid
    INNER JOIN usr.`co-cx-ops-analytics`.twilio_transcriptions t
        ON r.recording_sid = t.recording_sid
    WHERE t.transcription IS NOT NULL
        AND t.transcription != ''
        AND c.direction = 'inbound'  -- Solo llamadas entrantes
        AND c.start_time >= CURRENT_DATE() - INTERVAL 30 DAYS
""")

print(f"📊 Total de llamadas a auditar: {df_transcriptions.count()}")
display(df_transcriptions.limit(5))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Funciones de análisis

# COMMAND ----------

def check_greeting(transcription):
    """
    Verifica si el agente saludó correctamente
    """
    greetings = [
        'buenos días',
        'buenas tardes',
        'buenas noches',
        'hola',
        'bienvenido',
        'gracias por comunicarte',
        'gracias por contactarnos'
    ]
    
    # Buscar en los primeros 200 caracteres
    intro = transcription[:200].lower()
    
    for greeting in greetings:
        if greeting in intro:
            return True
    return False

def check_agent_identification(transcription):
    """
    Verifica si el agente se identificó
    """
    identification_phrases = [
        'mi nombre es',
        'soy',
        'habla',
        'le atiende',
        'con quien tengo el gusto'
    ]
    
    intro = transcription[:300].lower()
    
    for phrase in identification_phrases:
        if phrase in intro:
            return True
    return False

def check_help_offer(transcription):
    """
    Verifica si el agente ofreció ayuda
    """
    help_phrases = [
        'cómo puedo ayudarte',
        'en qué puedo ayudarte',
        'cómo te puedo ayudar',
        'en qué te puedo ayudar',
        'cuéntame',
        'dime',
        'cómo puedo apoyarte',
        'cómo te puedo asistir'
    ]
    
    intro = transcription[:400].lower()
    
    for phrase in help_phrases:
        if phrase in intro:
            return True
    return False

def check_farewell(transcription):
    """
    Verifica si hubo una despedida apropiada
    """
    farewells = [
        'que tengas un buen día',
        'que tengas un excelente día',
        'fue un placer',
        'gracias por comunicarte',
        'hasta luego',
        'nos vemos',
        'cuídate',
        'estamos para servirte'
    ]
    
    # Buscar en los últimos 200 caracteres
    ending = transcription[-200:].lower()
    
    for farewell in farewells:
        if farewell in ending:
            return True
    return False

def detect_forbidden_words(transcription):
    """
    Detecta palabras o frases prohibidas
    """
    forbidden = [
        'no puedo',
        'no sé',
        'imposible',
        'no tengo idea',
        'eso no se puede',
        'no hay forma',
        'no me preguntes',
        'no es mi problema',
        'qué fastidio',
        'qué pereza'
    ]
    
    text_lower = transcription.lower()
    found_words = []
    
    for word in forbidden:
        if word in text_lower:
            found_words.append(word)
    
    return found_words if found_words else None

def analyze_sentiment(transcription):
    """
    Analiza el sentimiento de la transcripción
    Retorna un score de -1 (muy negativo) a 1 (muy positivo)
    """
    try:
        blob = TextBlob(transcription)
        return round(blob.sentiment.polarity, 3)
    except:
        return 0.0

def calculate_quality_score(
    has_greeting,
    has_identification,
    has_help_offer,
    has_farewell,
    forbidden_words_count,
    sentiment_score,
    duration_seconds
):
    """
    Calcula un score de calidad de 0 a 100
    """
    score = 0
    
    # Componentes del protocolo (50 puntos)
    if has_greeting: score += 15
    if has_identification: score += 10
    if has_help_offer: score += 15
    if has_farewell: score += 10
    
    # Penalización por palabras prohibidas (hasta -20)
    if forbidden_words_count:
        score -= min(forbidden_words_count * 5, 20)
    
    # Sentimiento (20 puntos)
    # Convertir de [-1, 1] a [0, 20]
    sentiment_points = ((sentiment_score + 1) / 2) * 20
    score += sentiment_points
    
    # Duración apropiada (10 puntos)
    # Entre 2 y 10 minutos es ideal
    if 120 <= duration_seconds <= 600:
        score += 10
    elif duration_seconds < 120:
        score += 5  # Llamada muy corta
    else:
        score += 7  # Llamada larga pero completa
    
    return max(0, min(100, round(score)))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Registrar UDFs

# COMMAND ----------

# Crear UDFs para usar en Spark
check_greeting_udf = udf(check_greeting, BooleanType())
check_identification_udf = udf(check_agent_identification, BooleanType())
check_help_offer_udf = udf(check_help_offer, BooleanType())
check_farewell_udf = udf(check_farewell, BooleanType())
detect_forbidden_udf = udf(detect_forbidden_words, ArrayType(StringType()))
analyze_sentiment_udf = udf(analyze_sentiment, FloatType())

# UDF para quality score
calculate_quality_udf = udf(calculate_quality_score, IntegerType())

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Aplicar análisis a todas las transcripciones

# COMMAND ----------

# Aplicar todos los análisis
df_audited = df_transcriptions \
    .withColumn("has_greeting", check_greeting_udf(col("transcription"))) \
    .withColumn("has_identification", check_identification_udf(col("transcription"))) \
    .withColumn("has_help_offer", check_help_offer_udf(col("transcription"))) \
    .withColumn("has_farewell", check_farewell_udf(col("transcription"))) \
    .withColumn("forbidden_words", detect_forbidden_udf(col("transcription"))) \
    .withColumn("sentiment_score", analyze_sentiment_udf(col("transcription"))) \
    .withColumn("forbidden_words_count", size(coalesce(col("forbidden_words"), array())))

# Calcular quality score
df_audited = df_audited.withColumn(
    "quality_score",
    calculate_quality_udf(
        col("has_greeting"),
        col("has_identification"),
        col("has_help_offer"),
        col("has_farewell"),
        col("forbidden_words_count"),
        col("sentiment_score"),
        col("duration_seconds")
    )
)

# Agregar timestamp de auditoría
df_audited = df_audited.withColumn("audited_at", current_timestamp())

# Clasificar llamadas
df_audited = df_audited.withColumn(
    "quality_category",
    when(col("quality_score") >= 80, "Excelente")
    .when(col("quality_score") >= 60, "Buena")
    .when(col("quality_score") >= 40, "Regular")
    .otherwise("Requiere Atención")
)

# Marcar para revisión manual
df_audited = df_audited.withColumn(
    "needs_manual_review",
    when(
        (col("quality_score") < 50) |
        (col("forbidden_words_count") > 0) |
        (col("sentiment_score") < -0.3) |
        (col("duration_seconds") < 60),
        True
    ).otherwise(False)
)

display(df_audited.limit(10))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Guardar resultados de auditoría

# COMMAND ----------

catalog = "usr"
schema = "co-cx-ops-analytics"
table_name = "twilio_call_audits"

# Seleccionar columnas relevantes
df_final = df_audited.select(
    "call_sid",
    "from_number",
    "to_number",
    "start_time",
    "duration_seconds",
    "has_greeting",
    "has_identification",
    "has_help_offer",
    "has_farewell",
    "forbidden_words",
    "forbidden_words_count",
    "sentiment_score",
    "quality_score",
    "quality_category",
    "needs_manual_review",
    "audited_at"
)

# Guardar
df_final.write \
    .format("delta") \
    .mode("append") \
    .option("mergeSchema", "true") \
    .saveAsTable(f"{catalog}.`{schema}`.{table_name}")

print(f"✅ {df_final.count()} auditorías guardadas en {catalog}.{schema}.{table_name}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Estadísticas y reportes

# COMMAND ----------

# MAGIC %md
# MAGIC ### 7.1 Resumen general de calidad

# COMMAND ----------

spark.sql(f"""
    SELECT 
        quality_category,
        COUNT(*) as total_llamadas,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje,
        ROUND(AVG(quality_score), 2) as score_promedio,
        COUNT(CASE WHEN needs_manual_review THEN 1 END) as requieren_revision
    FROM {catalog}.`{schema}`.{table_name}
    WHERE DATE(start_time) >= CURRENT_DATE() - INTERVAL 7 DAYS
    GROUP BY quality_category
    ORDER BY score_promedio DESC
""").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 7.2 Análisis de protocolo

# COMMAND ----------

spark.sql(f"""
    SELECT 
        SUM(CASE WHEN has_greeting THEN 1 ELSE 0 END) as con_saludo,
        SUM(CASE WHEN NOT has_greeting THEN 1 ELSE 0 END) as sin_saludo,
        ROUND(AVG(CASE WHEN has_greeting THEN 1 ELSE 0 END) * 100, 2) as porcentaje_saludo,
        
        SUM(CASE WHEN has_identification THEN 1 ELSE 0 END) as con_identificacion,
        ROUND(AVG(CASE WHEN has_identification THEN 1 ELSE 0 END) * 100, 2) as porcentaje_identificacion,
        
        SUM(CASE WHEN has_help_offer THEN 1 ELSE 0 END) as con_ofrecimiento_ayuda,
        ROUND(AVG(CASE WHEN has_help_offer THEN 1 ELSE 0 END) * 100, 2) as porcentaje_ayuda,
        
        SUM(CASE WHEN has_farewell THEN 1 ELSE 0 END) as con_despedida,
        ROUND(AVG(CASE WHEN has_farewell THEN 1 ELSE 0 END) * 100, 2) as porcentaje_despedida
    FROM {catalog}.`{schema}`.{table_name}
    WHERE DATE(start_time) >= CURRENT_DATE() - INTERVAL 7 DAYS
""").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 7.3 Palabras prohibidas más comunes

# COMMAND ----------

spark.sql(f"""
    SELECT 
        exploded_word as palabra_prohibida,
        COUNT(*) as veces_detectada,
        COUNT(DISTINCT call_sid) as llamadas_diferentes
    FROM {catalog}.`{schema}`.{table_name}
    LATERAL VIEW explode(forbidden_words) AS exploded_word
    WHERE DATE(start_time) >= CURRENT_DATE() - INTERVAL 7 DAYS
    GROUP BY exploded_word
    ORDER BY veces_detectada DESC
""").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ### 7.4 Llamadas que requieren revisión manual

# COMMAND ----------

df_review_needed = spark.sql(f"""
    SELECT 
        a.call_sid,
        a.start_time,
        a.duration_seconds,
        a.quality_score,
        a.quality_category,
        a.forbidden_words,
        a.sentiment_score,
        SUBSTRING(t.transcription, 1, 200) as transcription_preview
    FROM {catalog}.`{schema}`.{table_name} a
    INNER JOIN {catalog}.`{schema}`.twilio_transcriptions t
        ON a.call_sid IN (
            SELECT call_sid 
            FROM {catalog}.`{schema}`.twilio_calls 
            WHERE call_sid = a.call_sid
        )
    WHERE a.needs_manual_review = TRUE
        AND DATE(a.start_time) >= CURRENT_DATE() - INTERVAL 7 DAYS
    ORDER BY a.quality_score ASC
    LIMIT 20
""")

print(f"🚨 Llamadas que requieren revisión: {df_review_needed.count()}")
display(df_review_needed)

# COMMAND ----------

# MAGIC %md
# MAGIC ### 7.5 Tendencias por día

# COMMAND ----------

spark.sql(f"""
    SELECT 
        DATE(start_time) as fecha,
        COUNT(*) as total_llamadas,
        ROUND(AVG(quality_score), 2) as score_promedio,
        ROUND(AVG(duration_seconds)/60, 2) as duracion_promedio_min,
        COUNT(CASE WHEN needs_manual_review THEN 1 END) as con_problemas,
        ROUND(AVG(sentiment_score), 3) as sentiment_promedio
    FROM {catalog}.`{schema}`.{table_name}
    WHERE DATE(start_time) >= CURRENT_DATE() - INTERVAL 30 DAYS
    GROUP BY DATE(start_time)
    ORDER BY fecha DESC
""").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Exportar reporte a Google Sheets (Opcional)

# COMMAND ----------

# Query para reporte ejecutivo
df_executive_report = spark.sql(f"""
    SELECT 
        call_sid,
        DATE(start_time) as fecha,
        CONCAT(
            SUBSTRING(from_number, 1, 3), 
            '***',
            SUBSTRING(from_number, -2, 2)
        ) as telefono_anonimizado,
        ROUND(duration_seconds/60, 2) as duracion_minutos,
        quality_score as puntaje_calidad,
        quality_category as categoria,
        CASE WHEN has_greeting THEN 'Sí' ELSE 'No' END as saludo,
        CASE WHEN has_identification THEN 'Sí' ELSE 'No' END as identificacion,
        CASE WHEN has_help_offer THEN 'Sí' ELSE 'No' END as ofrecimiento_ayuda,
        CASE WHEN has_farewell THEN 'Sí' ELSE 'No' END as despedida,
        COALESCE(array_join(forbidden_words, ', '), 'Ninguna') as palabras_prohibidas,
        ROUND(sentiment_score, 3) as sentimiento,
        CASE WHEN needs_manual_review THEN 'Sí' ELSE 'No' END as requiere_revision
    FROM {catalog}.`{schema}`.{table_name}
    WHERE DATE(start_time) >= CURRENT_DATE() - INTERVAL 7 DAYS
    ORDER BY start_time DESC
""")

display(df_executive_report)

# COMMAND ----------

# Opcional: Guardar en temporales para exportar a Sheets
# (Similar al proceso que ya conoces)

# df_executive_report.write \
#     .format("delta") \
#     .mode("overwrite") \
#     .save("/Volumes/usr/co-cx-ops-analytics/temporales/call_audit_report")

# COMMAND ----------

# MAGIC %md
# MAGIC ## ✅ Auditoría completada
# MAGIC 
# MAGIC **Siguientes acciones:**
# MAGIC 1. Revisar llamadas que requieren atención manual
# MAGIC 2. Enviar feedback a agentes con bajo score
# MAGIC 3. Configurar alertas para llamadas con quality_score < 40
# MAGIC 4. Exportar reportes a Google Sheets para seguimiento del equipo
# MAGIC 5. Programar este notebook para ejecutarse diariamente

# COMMAND ----------



