WITH embargo AS (
  SELECT customer__id, tags_, db__tx_instant AS tag_date
  FROM co__contract.customers__customer_tags_history
  LATERAL VIEW explode(customer__tags) AS tags_
  WHERE tags_ LIKE '%embargo cuenta%'
),
desembargo AS (
  SELECT customer__id, tags_, db__tx_instant AS tag_date
  FROM co__contract.customers__customer_tags_history
  LATERAL VIEW explode(customer__tags) AS tags_
  WHERE tags_ LIKE '%cuenta desembargada%'
)
SELECT
  a.customer__id,
  CONCAT('https://backoffice.nu.com.co/shuffle/#/person/', a.customer__id) AS person_view,
  DATE(h.db__tx_instant) AS cancellation_date,
  h.audit__user AS canceled_by,
  e.tags_ AS embargo_tag,
  DATE(e.tag_date) AS embargo_tag_date,
  d.tags_ AS desembargo_tag,
  DATE(d.tag_date) AS desembargo_tag_date,
  CASE
    WHEN h.audit__user LIKE '%.konecta@nu.com.co' THEN 'konecta'
    WHEN h.audit__user LIKE '%.teleperformance-co@nu.com.co' THEN 'teleperformance'
    ELSE 'nubank'
  END AS actor_affiliation,
  CASE
    WHEN d.tag_date IS NOT NULL AND d.tag_date < h.db__tx_instant THEN 'Sí'
    ELSE 'No'
  END AS `¿Se podía cancelar?`,
  CASE
    WHEN d.tag_date IS NOT NULL AND d.tag_date < h.db__tx_instant THEN 'N/A'
    ELSE 'La cuenta fue cancelada con tag de embargo.'
  END AS Comments
FROM co__contract.savings_accounts__savings_accounts AS a
JOIN co__contract.savings_accounts__savings_account_status_history AS h ON a.savings_account__id = h.savings_account__id
JOIN embargo AS e ON a.customer__id = e.customer__id
LEFT JOIN desembargo AS d ON a.customer__id = d.customer__id
WHERE h.savings_account__status = 'savings_account_status__canceled'
  AND h.db__tx_instant >= '2026-01-01'
  AND h.db__tx_instant > e.tag_date
  AND (h.audit__user LIKE '%.konecta@nu.com.co' OR h.audit__user LIKE '%.teleperformance-co@nu.com.co')
ORDER BY cancellation_date DESC
