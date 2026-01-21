# Databricks notebook source
# MAGIC %md
# MAGIC # Query de Embargo - Con Parámetro ACCOUNTID

# COMMAND ----------

# Crear el widget para ACCOUNTID
dbutils.widgets.text("ACCOUNTID", "663d082b-8e8a-48ff-a686-", "ACCOUNTID")

# Obtener el valor del widget
account_id = dbutils.widgets.get("ACCOUNTID")

# COMMAND ----------

# MAGIC %sql
# MAGIC WITH embargo AS (
# MAGIC   SELECT customer__id, tags_, db__tx_instant AS tag_date
# MAGIC   FROM co__contract.customers__customer_tags_history
# MAGIC   LATERAL VIEW explode(customer__tags) AS tags_
# MAGIC   WHERE tags_ LIKE '%embargo cuenta%'
# MAGIC ),
# MAGIC desembargo AS (
# MAGIC   SELECT customer__id, tags_, db__tx_instant AS tag_date
# MAGIC   FROM co__contract.customers__customer_tags_history
# MAGIC   LATERAL VIEW explode(customer__tags) AS tags_
# MAGIC   WHERE tags_ LIKE '%cuenta desembargada%'
# MAGIC )
# MAGIC SELECT
# MAGIC   a.customer__id,
# MAGIC   CONCAT('https://backoffice.nu.com.co/shuffle/#/person/', a.customer__id) AS person_view,
# MAGIC   DATE(h.db__tx_instant) AS cancellation_date,
# MAGIC   h.audit__user AS canceled_by,
# MAGIC   e.tags_ AS embargo_tag,
# MAGIC   DATE(e.tag_date) AS embargo_tag_date,
# MAGIC   d.tags_ AS desembargo_tag,
# MAGIC   DATE(d.tag_date) AS desembargo_tag_date,
# MAGIC   CASE
# MAGIC     WHEN h.audit__user LIKE '%.konecta@nu.com.co' THEN 'konecta'
# MAGIC     WHEN h.audit__user LIKE '%.teleperformance-co@nu.com.co' THEN 'teleperformance'
# MAGIC     ELSE 'nubank'
# MAGIC   END AS actor_affiliation,
# MAGIC   CASE
# MAGIC     WHEN d.tag_date IS NOT NULL AND d.tag_date < h.db__tx_instant THEN 'Sí'
# MAGIC     ELSE 'No'
# MAGIC   END AS `¿Se podía cancelar?`,
# MAGIC   CASE
# MAGIC     WHEN d.tag_date IS NOT NULL AND d.tag_date < h.db__tx_instant THEN 'N/A'
# MAGIC     ELSE 'La cuenta fue cancelada con tag de embargo.'
# MAGIC   END AS Comments
# MAGIC FROM co__contract.savings_accounts__savings_accounts AS a
# MAGIC JOIN co__contract.savings_accounts__savings_account_status_history AS h ON a.savings_account__id = h.savings_account__id
# MAGIC JOIN embargo AS e ON a.customer__id = e.customer__id
# MAGIC LEFT JOIN desembargo AS d ON a.customer__id = d.customer__id
# MAGIC WHERE h.savings_account__status = 'savings_account_status__canceled'
# MAGIC   AND h.db__tx_instant >= '2026-01-01'
# MAGIC   AND h.db__tx_instant > e.tag_date
# MAGIC   AND (h.audit__user LIKE '%.konecta@nu.com.co' OR h.audit__user LIKE '%.teleperformance-co@nu.com.co')
# MAGIC ORDER BY cancellation_date DESC

