-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" UUID NOT NULL,
    "linkId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEntry" (
    "id" UUID NOT NULL,
    "linkId" UUID NOT NULL,
    "clientId" UUID,
    "date" DATE NOT NULL,
    "workoutKey" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CalendarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_linkId_version_key" ON "PlanVersion"("linkId", "version");

-- CreateIndex
CREATE INDEX "CalendarEntry_clientId_date_idx" ON "CalendarEntry"("clientId", "date");

-- CreateIndex
CREATE INDEX "CalendarEntry_linkId_date_idx" ON "CalendarEntry"("linkId", "date");

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "CoachClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "CoachClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
