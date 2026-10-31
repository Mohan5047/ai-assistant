-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "scheduled_start" TIMESTAMP(3),
ADD COLUMN "scheduled_end" TIMESTAMP(3),
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN "event_id" UUID;

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "calendar_connections" ADD COLUMN "calendar_id" TEXT,
ADD COLUMN "sync_token" TEXT,
ADD COLUMN "granted_scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "last_sync_error" TEXT;

-- CreateIndex
CREATE INDEX "tasks_user_id_priority_idx" ON "tasks"("user_id", "priority");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
