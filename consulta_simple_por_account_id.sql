%sql
-- ============================================
-- CONSULTA POR ACCOUNT ID CON ANÁLISIS DE COMPLAINTS Y CHARGEBACKS
-- ============================================
-- Reemplaza :ACCOUNTID con el ID de la cuenta que quieres consultar

WITH 
-- Información básica de la cuenta
account_info AS (
  SELECT
    a.account__id,
    a.customer__id,
    a.account__status,
    CONCAT('https://backoffice.nu.com.co/shuffle/#/person/', a.customer__id) AS link_backoffice
  FROM etl.co__contract.credit_card_accounts__accounts a
  WHERE a.account__id = :ACCOUNTID  -- ⬅️ COLOCA AQUÍ EL ACCOUNT ID
),

-- Todos los chargebacks (dados y retirados)
all_chargebacks AS (
  SELECT
    account__id,
    adjustment__amount,
    ABS(adjustment__amount) AS monto_abs
  FROM etl.co__contract.line_items__adjustments
  WHERE 
    account__id = :ACCOUNTID
    AND SUBSTR(adjustment__type, 18) = 'chargeback'
),

-- Chargebacks agrupados por monto para ver balance
chargebacks_balance AS (
  SELECT
    account__id,
    monto_abs,
    SUM(CASE WHEN adjustment__amount < 0 THEN 1 ELSE 0 END) AS veces_dado,
    SUM(CASE WHEN adjustment__amount > 0 THEN 1 ELSE 0 END) AS veces_retirado
  FROM all_chargebacks
  GROUP BY account__id, monto_abs
),

-- Complaints de la cuenta con sus detalles individuales (TEMPORAL para luego relacionar con chargebacks)
complaints_details AS (
  SELECT 
    c.complaint__id,
    c.complaint__customer_id,
    c.complaint__status,
    c.complaint__filed_at,
    YEAR(c.complaint__filed_at) AS complaint_year,
    cs.complaint_subject__complained_amount,
    ic.internal_comment__body,
    -- Clasificación individual del complaint
    CASE 
      WHEN LOWER(ic.internal_comment__body) LIKE '%pre arbitration%' 
           OR LOWER(ic.internal_comment__body) LIKE '%arbitration%' THEN 'arbitration'
      WHEN LOWER(ic.internal_comment__body) LIKE '%td removal%' THEN 'td_removal'
      WHEN LOWER(ic.internal_comment__body) LIKE '%favour%' 
           OR LOWER(ic.internal_comment__body) LIKE '%lack of evidence%' THEN 'favour'
      ELSE 'sin_favour'
    END AS clasificacion_comment
  FROM co__contract.marte__complaints c
  JOIN (
    SELECT 
      complaint__id,
      complaint__customer_id,
      exploded_complaint_subject__id
    FROM co__contract.marte__complaints
    LATERAL VIEW explode(complaint_subject__id) AS exploded_complaint_subject__id
  ) c_expanded ON c.complaint__id = c_expanded.complaint__id
  JOIN etl.co__contract.marte__complaint_subjects cs
    ON c_expanded.exploded_complaint_subject__id = cs.complaint_subject__id
  LEFT JOIN (
    SELECT
      c.complaint__id,
      ic.internal_comment__body,
      RANK() OVER (PARTITION BY c.complaint__id ORDER BY ic.internal_comment__posted_at DESC) AS rnk
    FROM co__contract.marte__internal_comments ic
    JOIN (
      SELECT
        complaint__id,
        exploded_internal_comment__id AS internal_comment__id
      FROM co__contract.marte__complaints
      LATERAL VIEW explode(internal_comment__id) AS exploded_internal_comment__id
    ) c ON ic.internal_comment__id = c.internal_comment__id
  ) ic ON c.complaint__id = ic.complaint__id AND ic.rnk = 1
  JOIN account_info ai ON c.complaint__customer_id = ai.customer__id
),

-- Relacionar complaints SIN "favour" con sus chargebacks
complaints_sin_favour_con_chargebacks AS (
  SELECT
    cd.complaint__id,
    cd.complaint_subject__complained_amount,
    cb.veces_dado,
    cb.veces_retirado,
    CASE WHEN cb.veces_dado > cb.veces_retirado THEN 1 ELSE 0 END AS tiene_chargeback_pendiente
  FROM complaints_details cd
  LEFT JOIN chargebacks_balance cb 
    ON cd.complaint_subject__complained_amount = cb.monto_abs
  WHERE cd.clasificacion_comment = 'sin_favour'  -- Solo complaints sin favour
),

-- Resumen de chargebacks pendientes (solo de complaints sin favour)
chargeback_analysis AS (
  SELECT
    -- Lista de montos pendientes (solo de complaints sin favour)
    CONCAT_WS(' y abono por ', COLLECT_LIST(
      CASE WHEN tiene_chargeback_pendiente = 1
           THEN CONCAT('$', FORMAT_NUMBER(complaint_subject__complained_amount, 0))
           ELSE NULL END
    )) AS lista_montos_pendientes,
    -- Indica si hay algún chargeback pendiente
    MAX(tiene_chargeback_pendiente) AS tiene_pendientes
  FROM complaints_sin_favour_con_chargebacks
),

-- Análisis de complaints con la lógica correcta
complaints_analysis AS (
  SELECT
    -- Casos especiales (siempre revisar primero)
    MAX(CASE WHEN clasificacion_comment = 'arbitration' THEN 1 ELSE 0 END) AS tiene_arbitration,
    MAX(CASE WHEN clasificacion_comment = 'td_removal' THEN 1 ELSE 0 END) AS tiene_td_removal,
    
    -- 1. ¿TODOS los complaints son de 2022 o 2023?
    CASE 
      WHEN COUNT(*) > 0 AND MAX(complaint_year) <= 2023 THEN 1 
      ELSE 0 
    END AS todos_2022_2023,
    
    -- 2. Para complaints de 2024+: ¿Alguno está en disputa (NO resolved/canceled)?
    MAX(CASE 
      WHEN complaint_year >= 2024 
           AND complaint__status NOT IN ('complaint_status__resolved', 'complaint_status__canceled')
      THEN 1 ELSE 0 
    END) AS tiene_2024_en_disputa,
    
    -- 3. Para complaints de 2024+ resolved/canceled: ¿TODOS tienen favour?
    CASE 
      WHEN SUM(CASE WHEN complaint_year >= 2024 THEN 1 ELSE 0 END) > 0
           AND SUM(CASE WHEN complaint_year >= 2024 THEN 1 ELSE 0 END) = 
               SUM(CASE WHEN complaint_year >= 2024 AND clasificacion_comment = 'favour' THEN 1 ELSE 0 END)
      THEN 1 ELSE 0 
    END AS todos_2024_tienen_favour,
    
    -- Años de los complaints
    CONCAT_WS(' y ', COLLECT_SET(CAST(complaint_year AS STRING))) AS anios_complaints,
    COUNT(*) AS total_complaints
  FROM complaints_details
)

-- ============================================
-- PARTE 1: DETALLE DE CADA COMPLAINT
-- ============================================
SELECT
  ai.account__id AS Account_ID,
  ai.customer__id AS Customer_ID,
  ai.account__status AS Status,
  'Complaint' AS Tipo,
  cd.complaint__id AS ID,
  CONCAT('$', FORMAT_NUMBER(cd.complaint_subject__complained_amount, 0)) AS Monto,
  DATE(cd.complaint__filed_at) AS Fecha,
  cd.complaint_year AS `Año`,
  cd.complaint__status AS Estado_Complaint,
  SUBSTRING(cd.internal_comment__body, 1, 100) AS Comentario_Interno,
  ai.link_backoffice AS Link_Backoffice
FROM account_info ai
CROSS JOIN complaints_details cd

UNION ALL

-- ============================================
-- PARTE 2: FILA RESUMEN - DECISIÓN FINAL
-- ============================================
SELECT
  NULL AS Account_ID,
  NULL AS Customer_ID,
  NULL AS Status,
  NULL AS Tipo,
  NULL AS ID,
  NULL AS Monto,
  NULL AS Fecha,
  NULL AS `Año`,
  NULL AS Estado_Complaint,
  CASE
    -- CASOS ESPECIALES (siempre revisar primero)
    WHEN cpa.tiene_arbitration = 1 
      THEN 'No cancelar. Reportar con el equipo encargado o transferir a la Q especializada.'
    WHEN cpa.tiene_td_removal = 1 
      THEN 'Verificar si el abono temporal ya fue retirado en los Bill antes de cancelar.'
    
    -- 1. Si TODOS los complaints son de 2022 o 2023 → Cancelar (NO revisar chargebacks)
    WHEN cpa.todos_2022_2023 = 1 
      THEN CONCAT('Complaint del año ', cpa.anios_complaints, ', se puede cancelar.')
    
    -- 2. Si hay complaints de 2024+ en disputa (NO resolved/canceled) → Esperar
    WHEN cpa.tiene_2024_en_disputa = 1 
      THEN 'Complaint en proceso, esperar a su resolución.'
    
    -- 3. Si TODOS los complaints de 2024+ tienen "favour" → Cancelar (NO revisar chargebacks)
    WHEN cpa.todos_2024_tienen_favour = 1 
      THEN 'Todos los complaints tienen "favour", se puede cancelar.'
    
    -- 4. Si algún complaint de 2024+ NO tiene favour → Revisar chargebacks
    WHEN cha.tiene_pendientes = 1 
      THEN CONCAT('No se puede cancelar. Se necesita retirar abono por ', cha.lista_montos_pendientes, ' antes de proceder con la cancelación.')
    
    -- 5. Si no hay chargebacks pendientes → Cancelar
    ELSE 'Se puede cancelar.'
  END AS Comentario_Interno,
  NULL AS Link_Backoffice
FROM account_info ai
LEFT JOIN complaints_analysis cpa ON 1=1
LEFT JOIN chargeback_analysis cha ON 1=1

ORDER BY 
  CASE WHEN Tipo IS NULL THEN 2 ELSE 1 END,
  Fecha DESC
