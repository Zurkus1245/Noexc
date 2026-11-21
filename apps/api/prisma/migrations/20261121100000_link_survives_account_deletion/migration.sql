-- A link outlives the deletion of either party: the other party keeps the ended link and its history.
-- The deleted side's column becomes NULL instead of the row being cascaded away.
ALTER TABLE "CoachClient" DROP CONSTRAINT "CoachClient_coachId_fkey";
ALTER TABLE "CoachClient" DROP CONSTRAINT "CoachClient_clientId_fkey";
ALTER TABLE "CoachClient" ALTER COLUMN "coachId" DROP NOT NULL;
ALTER TABLE "CoachClient" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "CoachClient" ADD CONSTRAINT "CoachClient_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CoachClient" ADD CONSTRAINT "CoachClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Only ended links may have a missing party: an open link always has both coach and client.
ALTER TABLE "CoachClient" ADD CONSTRAINT "CoachClient_open_parties_check" CHECK ("status" = 'ended' OR ("coachId" IS NOT NULL AND "clientId" IS NOT NULL));
