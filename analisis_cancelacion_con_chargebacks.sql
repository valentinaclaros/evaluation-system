%sql
WITH 
-- CTE 1: Análisis de Chargebacks por cuenta
chargebacks_analysis AS (
  SELECT
    account__id,
    -- Contar chargebacks negativos (abonos dados)
    SUM(CASE WHEN adjustment__amount < 0 AND SUBSTR(adjustment__type, 18) = 'chargeback' THEN 1 ELSE 0 END) AS chargebacks_negativos,
    -- Contar chargebacks positivos (abonos retirados)
    SUM(CASE WHEN adjustment__amount > 0 AND SUBSTR(adjustment__type, 18) = 'chargeback' THEN 1 ELSE 0 END) AS chargebacks_positivos,
    -- Suma total de chargebacks negativos (monto pendiente)
    SUM(CASE WHEN adjustment__amount < 0 AND SUBSTR(adjustment__type, 18) = 'chargeback' THEN adjustment__amount ELSE 0 END) AS monto_abonos_pendientes,
    -- Detalle de todos los ajustes
    COLLECT_LIST(
      STRUCT(
        DATE(adjustment__post_date) AS day,
        adjustment__amount AS amount,
        SUBSTR(adjustment__type, 18) AS adj_type,
        SUBSTR(adjustment__type_detail, 25) AS adj_type_detail
      )
    ) AS adjustments_detail
  FROM etl.co__contract.line_items__adjustments
  WHERE 
    adjustment__type != 'adjustment_type__mastercard_credit_transaction'
    AND adjustment__type != 'adjustment_type__current_interest_discount'
    AND SUBSTR(adjustment__type_detail, 1, 25) != 'loan_installments_interest'
    AND SUBSTR(adjustment__type_detail, 1, 25) != 'loan_installments_discount'
    AND SUBSTR(adjustment__type_detail, 1, 25) != 'loan_adjustment'
    AND SUBSTR(adjustment__type_detail, 1, 25) != 'loan_liquidation'
    AND SUBSTR(adjustment__type_detail, 1, 25) != 'loan_installments'
  GROUP BY account__id
),

-- CTE 2: Lógica de si se puede cancelar
cancelacion_logic AS (
  SELECT
    account__id,
    chargebacks_negativos,
    chargebacks_positivos,
    monto_abonos_pendientes,
    adjustments_detail,
    CASE
      -- No hay chargebacks = se puede cancelar
      WHEN chargebacks_negativos = 0 AND chargebacks_positivos = 0 THEN 'SÍ'
      -- Hay chargebacks pero están balanceados (negativo + positivo) = se puede cancelar
      WHEN chargebacks_negativos > 0 AND chargebacks_positivos > 0 
           AND chargebacks_negativos = chargebacks_positivos THEN 'SÍ'
      -- Solo hay chargebacks negativos sin retirar = NO se puede cancelar
      WHEN chargebacks_negativos > 0 AND (chargebacks_positivos = 0 OR chargebacks_positivos < chargebacks_negativos) THEN 'NO'
      -- Otros casos
      ELSE 'REVISAR'
    END AS se_puede_cancelar,
    CASE
      -- No hay chargebacks
      WHEN chargebacks_negativos = 0 AND chargebacks_positivos = 0 
        THEN 'Sin chargebacks. Cuenta limpia para cancelar.'
      -- Chargebacks balanceados
      WHEN chargebacks_negativos > 0 AND chargebacks_positivos > 0 
           AND chargebacks_negativos = chargebacks_positivos 
        THEN CONCAT('Abonos completos (', chargebacks_negativos, ' dado(s) + ', chargebacks_positivos, ' retirado(s)). Se puede cancelar.')
      -- Chargebacks pendientes
      WHEN chargebacks_negativos > 0 AND (chargebacks_positivos = 0 OR chargebacks_positivos < chargebacks_negativos)
        THEN CONCAT('⚠️ Se debe retirar abono por $', FORMAT_NUMBER(ABS(monto_abonos_pendientes), 0), ' para poder cancelar. (', 
                    (chargebacks_negativos - chargebacks_positivos), ' chargeback(s) pendiente(s))')
      -- Otros casos
      ELSE 'Revisar manualmente los ajustes.'
    END AS comentario_cancelacion
  FROM chargebacks_analysis
),

-- CTE 3: Cuentas de crédito activas con complaints
cuentas_credito_activas AS (
  SELECT DISTINCT
    c.complaint__customer_id,
    a.account__id,
    'credito' AS account_type,
    a.account__status,
    c.complaint__status,
    c.complaint__id,
    cs.complaint_subject__complained_amount AS amount_del_complaint,
    c.complaint__reason,
    c.complaint__filed_at AS complaint__created_at
  FROM
    (
      SELECT 
        complaint__id,
        complaint__customer_id,
        complaint__status,
        complaint__reason,
        complaint__filed_at,
        exploded_complaint_subject__id
      FROM co__contract.marte__complaints
      LATERAL VIEW explode(complaint_subject__id) AS exploded_complaint_subject__id
    ) AS c
    JOIN etl.co__contract.marte__complaint_subjects AS cs
      ON c.exploded_complaint_subject__id = cs.complaint_subject__id
    JOIN etl.co__contract.credit_card_accounts__accounts AS a 
      ON c.complaint__customer_id = a.customer__id
  WHERE
    a.account__status = 'account_status__active'
),

-- CTE 4: Comentarios (último comentario por complaint)
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

-- CTE 5: Defunciones
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

-- SELECT FINAL: Unión de toda la información
SELECT 
  -- Información del cliente y cuenta
  ca.complaint__customer_id,
  ca.account__id,
  ca.account_type,
  ca.account__status,
  
  -- Información del complaint
  ca.complaint__id,
  ca.complaint__status,
  ca.amount_del_complaint,
  ca.complaint__reason,
  DATE(ca.complaint__created_at) AS complaint_created_date,
  
  -- Comentarios internos
  co.internal_comment__posted_at,
  co.internal_comment__body,
  co.internal_comment__id,
  
  -- Tag de defunción
  d.tags_ AS defuncion_tag,
  
  -- ⭐ ANÁLISIS DE CHARGEBACKS Y CANCELACIÓN ⭐
  COALESCE(cl.se_puede_cancelar, 'SÍ') AS se_puede_cancelar,
  COALESCE(cl.comentario_cancelacion, 'Sin chargebacks. Cuenta limpia para cancelar.') AS comentario_cancelacion,
  COALESCE(cl.chargebacks_negativos, 0) AS chargebacks_dados,
  COALESCE(cl.chargebacks_positivos, 0) AS chargebacks_retirados,
  COALESCE(cl.monto_abonos_pendientes, 0) AS monto_pendiente,
  
  -- Detalle de ajustes (para análisis detallado si es necesario)
  cl.adjustments_detail AS detalle_ajustes,
  
  -- Link al backoffice
  CONCAT('https://backoffice.nu.com.co/shuffle/#/person/', ca.complaint__customer_id) AS person_view

FROM cuentas_credito_activas ca

-- Join con análisis de chargebacks
LEFT JOIN cancelacion_logic cl
  ON ca.account__id = cl.account__id

-- Join con comentarios
LEFT JOIN comments co
  ON ca.complaint__id = co.complaint__id

-- Join con defunciones
LEFT JOIN Defunciones d
  ON ca.complaint__customer_id = d.customer__id

-- Filtro opcional: Descomentar para buscar por Account ID específico
-- WHERE ca.account__id = :ACCOUNTID

ORDER BY 
  -- Priorizar cuentas que NO se pueden cancelar
  CASE WHEN cl.se_puede_cancelar = 'NO' THEN 0 ELSE 1 END,
  ca.amount_del_complaint DESC, 
  ca.complaint__created_at DESC

