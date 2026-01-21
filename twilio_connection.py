# Databricks notebook source
# MAGIC %md
# MAGIC # Conexión Twilio - Extracción de Datos de Llamadas
# MAGIC 
# MAGIC Este notebook extrae información de llamadas desde Twilio y las guarda en Databricks.
# MAGIC 
# MAGIC **Prerrequisitos:**
# MAGIC - Librería `twilio` instalada en el cluster
# MAGIC - Secrets configurados en `twilio-secrets` scope

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Instalación y configuración

# COMMAND ----------

# Instalar Twilio (si no está en el cluster)
# %pip install twilio

# COMMAND ----------

from twilio.rest import Client
from datetime import datetime, timedelta
from pyspark.sql.types import *
import pandas as pd

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Obtener credenciales de forma segura

# COMMAND ----------

# Obtener credenciales desde Databricks Secrets
account_sid = dbutils.secrets.get(scope="twilio-secrets", key="account-sid")
auth_token = dbutils.secrets.get(scope="twilio-secrets", key="auth-token")

# Crear cliente de Twilio
client = Client(account_sid, auth_token)

print("✅ Conexión con Twilio establecida correctamente")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Definir funciones de extracción

# COMMAND ----------

def get_calls_data(start_date, end_date=None, limit=1000):
    """
    Extrae datos de llamadas desde Twilio
    
    Args:
        start_date: Fecha inicial (datetime o string 'YYYY-MM-DD')
        end_date: Fecha final (opcional, por defecto hoy)
        limit: Número máximo de llamadas a extraer
    
    Returns:
        DataFrame de Spark con datos de llamadas
    """
    
    # Convertir strings a datetime si es necesario
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    
    if end_date is None:
        end_date = datetime.now()
    elif isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    
    print(f"🔍 Extrayendo llamadas desde {start_date} hasta {end_date}...")
    
    # Obtener llamadas desde Twilio
    calls = client.calls.list(
        start_time_after=start_date,
        start_time_before=end_date,
        limit=limit
    )
    
    # Convertir a lista de diccionarios
    calls_data = []
    for call in calls:
        calls_data.append({
            'call_sid': call.sid,
            'from_number': call.from_,
            'to_number': call.to,
            'direction': call.direction,  # inbound o outbound
            'status': call.status,
            'start_time': call.start_time,
            'end_time': call.end_time,
            'duration_seconds': call.duration,
            'price': call.price,
            'price_unit': call.price_unit,
            'answered_by': call.answered_by,
            'forwarded_from': call.forwarded_from,
            'parent_call_sid': call.parent_call_sid,
            'queue_time': call.queue_time
        })
    
    print(f"✅ Se extrajeron {len(calls_data)} llamadas")
    
    # Convertir a DataFrame de Spark
    if calls_data:
        df_pandas = pd.DataFrame(calls_data)
        df_spark = spark.createDataFrame(df_pandas)
        return df_spark
    else:
        print("⚠️ No se encontraron llamadas en el rango especificado")
        return None

# COMMAND ----------

def get_recordings_for_calls(calls_df):
    """
    Obtiene las URLs de grabaciones para las llamadas
    
    Args:
        calls_df: DataFrame con call_sid
    
    Returns:
        DataFrame con información de grabaciones
    """
    
    call_sids = [row.call_sid for row in calls_df.select('call_sid').collect()]
    
    print(f"🎙️ Obteniendo grabaciones para {len(call_sids)} llamadas...")
    
    recordings_data = []
    
    for call_sid in call_sids:
        try:
            recordings = client.recordings.list(call_sid=call_sid)
            
            for recording in recordings:
                recordings_data.append({
                    'call_sid': call_sid,
                    'recording_sid': recording.sid,
                    'duration': recording.duration,
                    'recording_url': f"https://api.twilio.com{recording.uri.replace('.json', '.mp3')}",
                    'status': recording.status,
                    'channels': recording.channels,
                    'date_created': recording.date_created
                })
        except Exception as e:
            print(f"⚠️ Error obteniendo grabación para {call_sid}: {str(e)}")
            continue
    
    print(f"✅ Se encontraron {len(recordings_data)} grabaciones")
    
    if recordings_data:
        df_pandas = pd.DataFrame(recordings_data)
        df_spark = spark.createDataFrame(df_pandas)
        return df_spark
    else:
        return None

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Extraer datos (Ejemplo: últimos 7 días)

# COMMAND ----------

# Definir rango de fechas
start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
end_date = datetime.now().strftime('%Y-%m-%d')

print(f"📅 Rango de fechas: {start_date} a {end_date}")

# COMMAND ----------

# Extraer llamadas
df_calls = get_calls_data(start_date, end_date, limit=5000)

# Mostrar muestra
if df_calls:
    display(df_calls.limit(10))
else:
    print("⚠️ No hay datos para mostrar")

# COMMAND ----------

# Extraer grabaciones
if df_calls:
    df_recordings = get_recordings_for_calls(df_calls)
    
    if df_recordings:
        display(df_recordings.limit(10))
    else:
        print("⚠️ No se encontraron grabaciones")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Enriquecer con datos internos (Opcional)

# COMMAND ----------

# Si tienes una tabla con información de agentes, puedes hacer join
# Ejemplo: unir con datos de otsa_consolidated

if df_calls:
    # Extraer solo llamadas inbound (entrantes)
    df_inbound = df_calls.filter(df_calls.direction == 'inbound')
    
    # Aquí puedes hacer join con tus tablas internas si tienes un identificador común
    # Por ejemplo, si guardas el call_sid en otsa_consolidated:
    
    # df_enriched = df_inbound.join(
    #     spark.table("usr.`co-cx-ops-analytics`.otsa_consolidated"),
    #     df_inbound.call_sid == spark.table(...).twilio_call_sid,
    #     "left"
    # )
    
    display(df_inbound.limit(10))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Guardar datos en Delta Table

# COMMAND ----------

# Definir schema de destino
catalog = "usr"
schema = "co-cx-ops-analytics"
table_calls = "twilio_calls"
table_recordings = "twilio_recordings"

# COMMAND ----------

# Guardar llamadas
if df_calls:
    # Agregar timestamp de carga
    from pyspark.sql.functions import current_timestamp
    df_calls_final = df_calls.withColumn("loaded_at", current_timestamp())
    
    # Guardar como Delta Table (modo append para no perder datos históricos)
    df_calls_final.write \
        .format("delta") \
        .mode("append") \
        .option("mergeSchema", "true") \
        .saveAsTable(f"{catalog}.`{schema}`.{table_calls}")
    
    print(f"✅ Datos de llamadas guardados en {catalog}.{schema}.{table_calls}")

# COMMAND ----------

# Guardar grabaciones
if df_recordings:
    df_recordings_final = df_recordings.withColumn("loaded_at", current_timestamp())
    
    df_recordings_final.write \
        .format("delta") \
        .mode("append") \
        .option("mergeSchema", "true") \
        .saveAsTable(f"{catalog}.`{schema}`.{table_recordings}")
    
    print(f"✅ Datos de grabaciones guardados en {catalog}.{schema}.{table_recordings}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Verificación final

# COMMAND ----------

# Verificar datos guardados
print("📊 Resumen de datos guardados:")
print("\n🔹 Llamadas:")
spark.sql(f"""
    SELECT 
        DATE(start_time) as fecha,
        COUNT(*) as total_llamadas,
        SUM(duration_seconds)/60 as minutos_totales,
        COUNT(DISTINCT from_number) as clientes_unicos
    FROM {catalog}.`{schema}`.{table_calls}
    WHERE DATE(start_time) >= '{start_date}'
    GROUP BY DATE(start_time)
    ORDER BY fecha DESC
""").show()

print("\n🔹 Grabaciones:")
spark.sql(f"""
    SELECT 
        COUNT(*) as total_grabaciones,
        SUM(duration) as segundos_totales,
        COUNT(DISTINCT call_sid) as llamadas_con_grabacion
    FROM {catalog}.`{schema}`.{table_recordings}
""").show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## ✅ Proceso completado
# MAGIC 
# MAGIC **Próximos pasos:**
# MAGIC 1. Ejecuta el notebook de transcripción: `call_transcription.py`
# MAGIC 2. Ejecuta el notebook de análisis: `call_audit_analysis.py`
# MAGIC 3. Configura un Job para ejecutar esto diariamente

# COMMAND ----------



