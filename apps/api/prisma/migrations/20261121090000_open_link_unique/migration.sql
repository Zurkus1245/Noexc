-- At most one non-ended link per (coach, client); ended links are terminal and may repeat.
-- Prisma schema cannot express partial unique indexes, so this lives in SQL only.
CREATE UNIQUE INDEX "CoachClient_open_link_key" ON "CoachClient"("coachId", "clientId") WHERE "status" <> 'ended';
