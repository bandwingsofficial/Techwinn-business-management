CREATE TYPE "DailyTaskRealtimeEventType" AS ENUM (
  'TASK_CREATED',
  'TASK_UPDATED',
  'ASSIGNEES_CHANGED',
  'STAGE_MOVED',
  'TASK_DELETED'
);

CREATE TABLE IF NOT EXISTS "daily_task_realtime_events" (
  "id" BIGSERIAL NOT NULL,
  "organization_id" UUID NOT NULL,
  "daily_task_id" UUID,
  "type" "DailyTaskRealtimeEventType" NOT NULL,
  "recipient_admin_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "notify_organization_managers" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_task_realtime_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_task_realtime_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "daily_task_realtime_events_organization_id_id_idx"
  ON "daily_task_realtime_events"("organization_id", "id");