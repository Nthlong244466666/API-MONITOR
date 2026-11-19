-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');

-- CreateEnum
CREATE TYPE "AssertionType" AS ENUM ('STATUS', 'LATENCY', 'JSON');

-- CreateEnum
CREATE TYPE "AssertionOperator" AS ENUM ('EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE', 'EXISTS', 'NOT_EXISTS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('OPENED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MonitorStatus" AS ENUM ('UNKNOWN', 'UP', 'DOWN');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_requests" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'GET',
    "url" TEXT NOT NULL,
    "headers" JSONB,
    "body" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "api_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_assertions" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "type" "AssertionType" NOT NULL,
    "operator" "AssertionOperator" NOT NULL,
    "target" TEXT,
    "expected_value" JSONB,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "request_assertions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_executions" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "is_success" BOOLEAN NOT NULL,
    "response_body" TEXT,
    "response_headers" JSONB,
    "assertion_results" JSONB,
    "error_message" TEXT,
    "executed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitors" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "interval_seconds" INTEGER NOT NULL DEFAULT 300,
    "timeout_ms" INTEGER NOT NULL DEFAULT 10000,
    "failure_threshold" INTEGER NOT NULL DEFAULT 3,
    "recovery_threshold" INTEGER NOT NULL DEFAULT 2,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "MonitorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "consecutive_successes" INTEGER NOT NULL DEFAULT 0,
    "next_check_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "monitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitor_checks" (
    "id" UUID NOT NULL,
    "monitor_id" UUID NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "is_success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "checked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitor_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "monitor_id" UUID NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");

-- CreateIndex
CREATE INDEX "projects_workspace_id_idx" ON "projects"("workspace_id");

-- CreateIndex
CREATE INDEX "api_requests_project_id_idx" ON "api_requests"("project_id");

-- CreateIndex
CREATE INDEX "request_assertions_request_id_idx" ON "request_assertions"("request_id");

-- CreateIndex
CREATE INDEX "request_executions_request_id_executed_at_idx" ON "request_executions"("request_id", "executed_at");

-- CreateIndex
CREATE INDEX "monitors_request_id_idx" ON "monitors"("request_id");

-- CreateIndex
CREATE INDEX "monitors_is_enabled_next_check_at_idx" ON "monitors"("is_enabled", "next_check_at");

-- CreateIndex
CREATE INDEX "monitor_checks_monitor_id_checked_at_idx" ON "monitor_checks"("monitor_id", "checked_at");

-- CreateIndex
CREATE INDEX "incidents_monitor_id_started_at_idx" ON "incidents"("monitor_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_one_open_per_monitor" ON "incidents"("monitor_id") WHERE ("status" = 'OPEN');

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_incident_id_idx" ON "notifications"("incident_id");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_assertions" ADD CONSTRAINT "request_assertions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_executions" ADD CONSTRAINT "request_executions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_checks" ADD CONSTRAINT "monitor_checks_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- API MONITOR - DATABASE CHECK CONSTRAINTS
-- =============================================

-- 1. Monitor interval: 60 seconds to 24 hours
ALTER TABLE "monitors"
ADD CONSTRAINT "monitors_interval_range"
CHECK ("interval_seconds" BETWEEN 60 AND 86400);

-- 2. Request timeout: 1 to 30 seconds
ALTER TABLE "monitors"
ADD CONSTRAINT "monitors_timeout_range"
CHECK ("timeout_ms" BETWEEN 1000 AND 30000);

-- 3. Failure threshold: 1 to 20
ALTER TABLE "monitors"
ADD CONSTRAINT "monitors_failure_threshold_range"
CHECK ("failure_threshold" BETWEEN 1 AND 20);

-- 4. Recovery threshold: 1 to 20
ALTER TABLE "monitors"
ADD CONSTRAINT "monitors_recovery_threshold_range"
CHECK ("recovery_threshold" BETWEEN 1 AND 20);

-- 5. Consecutive counters cannot be negative
ALTER TABLE "monitors"
ADD CONSTRAINT "monitors_counters_nonnegative"
CHECK (
  "consecutive_failures" >= 0
  AND "consecutive_successes" >= 0
);

-- 6. Incident status and resolution consistency
ALTER TABLE "incidents"
ADD CONSTRAINT "incidents_resolution_consistency"
CHECK (
  ("status" = 'OPEN' AND "resolved_at" IS NULL)
  OR
  ("status" = 'RESOLVED' AND "resolved_at" IS NOT NULL)
);
