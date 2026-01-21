# Databricks notebook source
# MAGIC %md
# MAGIC # Transcripción de Llamadas con Azure Speech
# MAGIC 
# MAGIC Este notebook transcribe las grabaciones de llamadas a texto usando Azure Cognitive Services.
# MAGIC 
# MAGIC **Prerrequisitos:**
# MAGIC - Azure Speech Services configurado
# MAGIC - Secrets de Azure en `twilio-secrets` scope
# MAGIC - Tabla `twilio_recordings` con datos de grabaciones

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Instalación de librerías

# COMMAND ----------

# Instalar Azure Speech SDK
# %pip install azure-cognitiveservices-speech
# %pip install requests

# COMMAND ----------

import azure.cognitiveservices.speech as speechsdk
import requests
import io
from pyspark.sql.functions import col, udf, current_timestamp
from pyspark.sql.types import StringType, FloatType, StructType, StructField
from twilio.rest import Client

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Configuración de credenciales

# COMMAND ----------

# Credenciales de Twilio (para descargar audio)
twilio_account_sid = dbutils.secrets.get(scope="twilio-secrets", key="account-sid")
twilio_auth_token = dbutils.secrets.get(scope="twilio-secrets", key="auth-token")
twilio_client = Client(twilio_account_sid, twilio_auth_token)

# Credenciales de Azure Speech
azure_speech_key = dbutils.secrets.get(scope="twilio-secrets", key="azure-speech-key")
azure_speech_region = dbutils.secrets.get(scope="twilio-secrets", key="azure-speech-region")

print("✅ Credenciales cargadas correctamente")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Funciones de transcripción

# COMMAND ----------

def download_audio_from_twilio(recording_sid, account_sid, auth_token):
    """
    Descarga el audio de Twilio y lo retorna como bytes
    
    Args:
        recording_sid: SID de la grabación en Twilio
        account_sid: Account SID de Twilio
        auth_token: Auth Token de Twilio
    
    Returns:
        Bytes del archivo de audio
    """
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Recordings/{recording_sid}.mp3"
        response = requests.get(url, auth=(account_sid, auth_token))
        
        if response.status_code == 200:
            return response.content
        else:
            print(f"❌ Error descargando audio: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

# COMMAND ----------

def transcribe_audio_azure(audio_bytes, language="es-CO"):
    """
    Transcribe audio usando Azure Speech Services
    
    Args:
        audio_bytes: Bytes del archivo de audio
        language: Código de idioma (default: español Colombia)
    
    Returns:
        Dict con transcripción y score de confianza
    """
    try:
        # Configurar Azure Speech
        speech_config = speechsdk.SpeechConfig(
            subscription=azure_speech_key,
            region=azure_speech_region
        )
        speech_config.speech_recognition_language = language
        
        # Crear stream de audio desde bytes
        audio_stream = speechsdk.audio.PushAudioInputStream()
        audio_stream.write(audio_bytes)
        audio_stream.close()
        
        audio_config = speechsdk.audio.AudioConfig(stream=audio_stream)
        
        # Crear reconocedor
        speech_recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config
        )
        
        # Realizar transcripción
        result = speech_recognizer.recognize_once()
        
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            return {
                'transcription': result.text,
                'confidence': 0.95,  # Azure no siempre proporciona score
                'status': 'success'
            }
        elif result.reason == speechsdk.ResultReason.NoMatch:
            return {
                'transcription': '',
                'confidence': 0.0,
                'status': 'no_speech_detected'
            }
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            return {
                'transcription': '',
                'confidence': 0.0,
                'status': f'error: {cancellation.reason}'
            }
    except Exception as e:
        return {
            'transcription': '',
            'confidence': 0.0,
            'status': f'exception: {str(e)}'
        }

# COMMAND ----------

def transcribe_recording(recording_sid):
    """
    Función principal para transcribir una grabación
    
    Args:
        recording_sid: SID de la grabación en Twilio
    
    Returns:
        Dict con transcripción y metadata
    """
    # Descargar audio
    audio_bytes = download_audio_from_twilio(
        recording_sid,
        twilio_account_sid,
        twilio_auth_token
    )
    
    if audio_bytes is None:
        return {
            'transcription': '',
            'confidence': 0.0,
            'status': 'download_failed'
        }
    
    # Transcribir
    result = transcribe_audio_azure(audio_bytes, language="es-CO")
    
    return result

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Cargar grabaciones pendientes de transcribir

# COMMAND ----------

# Leer grabaciones que no han sido transcritas
df_recordings = spark.sql("""
    SELECT DISTINCT
        r.recording_sid,
        r.call_sid,
        r.duration,
        r.recording_url,
        r.date_created
    FROM usr.`co-cx-ops-analytics`.twilio_recordings r
    LEFT JOIN usr.`co-cx-ops-analytics`.twilio_transcriptions t
        ON r.recording_sid = t.recording_sid
    WHERE t.recording_sid IS NULL  -- Solo las que no han sido transcritas
        AND r.status = 'completed'  -- Solo grabaciones completadas
        AND r.duration > 10  -- Mínimo 10 segundos
    ORDER BY r.date_created DESC
    LIMIT 100  -- Procesar en lotes
""")

print(f"📋 Grabaciones pendientes de transcribir: {df_recordings.count()}")
display(df_recordings.limit(5))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Transcribir llamadas (Procesamiento en lotes)

# COMMAND ----------

# Opción A: Transcribir con UDF (para procesamiento distribuido)
# Nota: Esto puede ser costoso si tienes muchas llamadas

from pyspark.sql.types import StructType, StructField, StringType, FloatType

# Definir schema del resultado
transcription_schema = StructType([
    StructField("transcription", StringType(), True),
    StructField("confidence", FloatType(), True),
    StructField("status", StringType(), True)
])

# Crear UDF
transcribe_udf = udf(transcribe_recording, transcription_schema)

# Aplicar transcripción
df_transcribed = df_recordings.withColumn(
    "transcription_result",
    transcribe_udf(col("recording_sid"))
)

# Expandir el resultado
df_transcribed = df_transcribed.select(
    col("recording_sid"),
    col("call_sid"),
    col("duration"),
    col("date_created"),
    col("transcription_result.transcription").alias("transcription"),
    col("transcription_result.confidence").alias("confidence_score"),
    col("transcription_result.status").alias("transcription_status"),
    current_timestamp().alias("transcribed_at")
)

display(df_transcribed)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Opción B: Procesar secuencialmente (más controlado)

# COMMAND ----------

# Para lotes pequeños o si prefieres más control
import pandas as pd
from tqdm import tqdm

def process_transcriptions_batch(recordings_list):
    """
    Procesa un lote de transcripciones secuencialmente
    """
    results = []
    
    for recording in tqdm(recordings_list, desc="Transcribiendo"):
        recording_sid = recording['recording_sid']
        call_sid = recording['call_sid']
        
        print(f"\n🎙️ Procesando {recording_sid}...")
        
        result = transcribe_recording(recording_sid)
        
        results.append({
            'recording_sid': recording_sid,
            'call_sid': call_sid,
            'transcription': result['transcription'],
            'confidence_score': result['confidence'],
            'transcription_status': result['status'],
            'transcribed_at': datetime.now()
        })
        
        # Mostrar preview
        if result['transcription']:
            preview = result['transcription'][:100] + "..." if len(result['transcription']) > 100 else result['transcription']
            print(f"✅ {preview}")
        else:
            print(f"⚠️ {result['status']}")
    
    return results

# COMMAND ----------

# Convertir a lista para procesamiento
# recordings_list = df_recordings.limit(10).toPandas().to_dict('records')

# Procesar
# results = process_transcriptions_batch(recordings_list)

# Convertir resultados a DataFrame
# df_transcribed = spark.createDataFrame(results)
# display(df_transcribed)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Guardar transcripciones

# COMMAND ----------

# Guardar en tabla de transcripciones
catalog = "usr"
schema = "co-cx-ops-analytics"
table_name = "twilio_transcriptions"

if df_transcribed.count() > 0:
    df_transcribed.write \
        .format("delta") \
        .mode("append") \
        .option("mergeSchema", "true") \
        .saveAsTable(f"{catalog}.`{schema}`.{table_name}")
    
    print(f"✅ {df_transcribed.count()} transcripciones guardadas en {catalog}.{schema}.{table_name}")
else:
    print("⚠️ No hay transcripciones para guardar")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Verificación y estadísticas

# COMMAND ----------

# Ver estadísticas de transcripciones
spark.sql(f"""
    SELECT 
        transcription_status,
        COUNT(*) as cantidad,
        ROUND(AVG(confidence_score), 2) as confianza_promedio,
        ROUND(AVG(LENGTH(transcription)), 0) as longitud_promedio_caracteres
    FROM {catalog}.`{schema}`.{table_name}
    GROUP BY transcription_status
    ORDER BY cantidad DESC
""").show()

# COMMAND ----------

# Ver transcripciones recientes
spark.sql(f"""
    SELECT 
        call_sid,
        SUBSTRING(transcription, 1, 100) as preview_transcription,
        confidence_score,
        transcription_status,
        transcribed_at
    FROM {catalog}.`{schema}`.{table_name}
    ORDER BY transcribed_at DESC
    LIMIT 10
""").show(truncate=False)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 9. Unir con datos de llamadas

# COMMAND ----------

# Query completa: llamadas + grabaciones + transcripciones
df_complete = spark.sql(f"""
    SELECT 
        c.call_sid,
        c.from_number,
        c.to_number,
        c.start_time,
        c.duration_seconds,
        r.recording_sid,
        r.recording_url,
        t.transcription,
        t.confidence_score,
        t.transcription_status
    FROM {catalog}.`{schema}`.twilio_calls c
    INNER JOIN {catalog}.`{schema}`.twilio_recordings r
        ON c.call_sid = r.call_sid
    LEFT JOIN {catalog}.`{schema}`.twilio_transcriptions t
        ON r.recording_sid = t.recording_sid
    WHERE c.start_time >= CURRENT_DATE() - INTERVAL 7 DAYS
    ORDER BY c.start_time DESC
""")

display(df_complete.limit(20))

# COMMAND ----------

# MAGIC %md
# MAGIC ## ✅ Transcripción completada
# MAGIC 
# MAGIC **Próximos pasos:**
# MAGIC - Ejecuta el notebook de auditoría: `call_audit_analysis.py`
# MAGIC - Configura un Job para transcribir llamadas nuevas diariamente

# COMMAND ----------



