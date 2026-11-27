-- Account deletion of a client removes their calendar entries (health data) in the database, not only by application code.
ALTER TABLE "CalendarEntry" DROP CONSTRAINT "CalendarEntry_clientId_fkey";
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
