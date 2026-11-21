-- Link lists are keyset-paged on (createdAt, id) within one party; the coach list also filters on status.
-- The composite indexes lead with the party column, so the single-column indexes they replace are redundant.
CREATE INDEX "CoachClient_coachId_status_createdAt_id_idx" ON "CoachClient"("coachId", "status", "createdAt", "id");
CREATE INDEX "CoachClient_clientId_createdAt_id_idx" ON "CoachClient"("clientId", "createdAt", "id");
DROP INDEX "CoachClient_coachId_idx";
DROP INDEX "CoachClient_clientId_idx";
