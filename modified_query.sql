SELECT
  local_start_date,
  agent,
  actor_affiliation,
  subject_id AS customer_id,
  CONCAT('https://backoffice.nu.com.co/shuffle/#/person/', subject_id) AS person_view,
  selected_reason,
  activity_type,
  survey_nps AS tnps,
  CASE 
    WHEN survey_nps >= 9 THEN 'promoters'
    WHEN survey_nps <= 6 THEN 'detractors'
    ELSE 'neutrals'
  END AS tnps_segment
FROM usr.`co-cx-ops-analytics`.otsa_consolidated
WHERE
  status = 'finished'
  AND actor_affiliation NOT IN ('nubank','null')
  AND actor_squad IN ('customer_mgmt', 'central_team','general')
  AND survey_nps IS NOT NULL  -- ✅ Cambiado de "IS NULL" a "IS NOT NULL"
  AND activity_type IN ('chat','email','inbound_call')
  AND local_start_date >= '2026-01-16'
  AND local_start_date < '2026-01-17'
ORDER BY
  local_start_week DESC

