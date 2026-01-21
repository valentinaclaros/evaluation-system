WITH cuentas_credito_activas AS (
  -- Todas las cuentas de CRÉDITO que están ACTUALMENTE activas con complaints
  SELECT DISTINCT
    c.complaint__customer_id,
    a.account__id,
    'credito' AS account_type,
    a.account__status,
    c.complaint__status,
    c.complaint__id,
    c.complaint_subject__complained_amount AS amount_del_complaint,
    c.complaint__reason,
    c.complaint__filed_at AS complaint__created_at
  FROM
    co__contract.marte__complaints AS c
    JOIN etl.co__contract.credit_card_accounts__accounts AS a 
      ON c.complaint__customer_id = a.customer__id
  WHERE
    a.account__status = 'account_status__active' 
),
comments AS (
  SELECT *
  FROM (
    SELECT *,
      RANK() OVER (
        PARTITION BY complaint__id 
        ORDER BY internal_comment__posted_at DESC
      ) AS RANK
    FROM (
      SELECT
        c.complaint__id,
        ic.internal_comment__posted_at,
        ic.internal_comment__body,
        ic.internal_comment__id,
        c.complaint__status,
        c.complaint__customer_id
      FROM
        co__contract.marte__internal_comments ic
        LEFT JOIN (
          SELECT
            complaint__id,
            complaint__customer_id,
            complaint__status,
            exploded_internal_comment__id AS internal_comment__id
          FROM
            co__contract.marte__complaints
            LATERAL VIEW explode(internal_comment__id) AS exploded_internal_comment__id
        ) c
        USING (internal_comment__id)
    )
  )
  WHERE RANK = 1
    AND complaint__status IN (
      'complaint_status__resolved',
      'complaint_status__canceled',
      'complaint_status__in_dispute',
      'complaint_status__in_analysis',
      'complaint_status_action_required',
      'complaint_status__ready_to_dispute'
    )
),
Defunciones AS (
  SELECT
    customer__id,
    tags_
  FROM
    co__contract.customers__customer_tags_history
    LATERAL VIEW explode(customer__tags) AS tags_
  WHERE
    tags_ LIKE ('%defunción%')
)
SELECT 
  ca.complaint__customer_id,
  ca.account__id,
  ca.account_type,
  ca.account__status,
  ca.complaint__id,
  ca.complaint__status,
  ca.amount_del_complaint,
  ca.complaint__reason,
  DATE(ca.complaint__created_at) AS complaint_created_date,
  co.internal_comment__posted_at,
  co.internal_comment__body,
  co.internal_comment__id,
  d.tags_ AS defuncion_tag,
  CONCAT('https://backoffice.nu.com.co/shuffle/#/person/', ca.complaint__customer_id) AS person_view
FROM cuentas_credito_activas ca
LEFT JOIN comments co
  ON ca.complaint__id = co.complaint__id
LEFT JOIN Defunciones d
  ON ca.complaint__customer_id = d.customer__id
ORDER BY ca.amount_del_complaint DESC, ca.complaint__created_at DESC
