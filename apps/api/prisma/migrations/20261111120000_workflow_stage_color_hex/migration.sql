-- Persist workflow stage colors as HEX; convert legacy named tokens.
UPDATE "daily_task_workflow_stages"
SET "color_token" = CASE lower("color_token")
  WHEN 'slate' THEN '#64748b'
  WHEN 'blue' THEN '#2563eb'
  WHEN 'purple' THEN '#7c3aed'
  WHEN 'violet' THEN '#7c3aed'
  WHEN 'pink' THEN '#db2777'
  WHEN 'rose' THEN '#db2777'
  WHEN 'orange' THEN '#ea580c'
  WHEN 'amber' THEN '#ea580c'
  WHEN 'green' THEN '#16a34a'
  WHEN 'emerald' THEN '#16a34a'
  WHEN 'cyan' THEN '#0891b2'
  ELSE lower("color_token")
END
WHERE "color_token" !~* '^#[0-9a-f]{6}$';

ALTER TABLE "daily_task_workflow_stages"
  ALTER COLUMN "color_token" SET DEFAULT '#64748b';
