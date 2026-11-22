-- CreateTable
CREATE TABLE "incident_analyses" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "diagnosis" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_analyses_incident_id_created_at_idx" ON "incident_analyses"("incident_id", "created_at");

-- AddForeignKey
ALTER TABLE "incident_analyses" ADD CONSTRAINT "incident_analyses_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
