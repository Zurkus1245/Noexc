import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, type PlanVersion } from '../../generated/prisma/client';
import type { PlanContent } from '@noexcuse/contracts';

export type Db = Prisma.TransactionClient;

export type DateRange = { from: Date; to: Date };

// The latest version of one link, the columns every plan read needs.
export type PlanVersionHead = Pick<PlanVersion, 'linkId' | 'version' | 'content' | 'createdAt'>;

// Owns PlanVersion and CalendarEntry. Link rows belong to coaching and are never read or written here.
// Link locks are taken by coaching's AccessPolicy: every writer runs under them.
@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  currentVersion(linkId: string, db: Db = this.prisma) {
    return db.planVersion.findFirst({ where: { linkId }, orderBy: { version: 'desc' } });
  }

  // One statement: the highest version of each link, with the links bound as a single IN list.
  async currentVersions(linkIds: readonly string[], db: Db = this.prisma): Promise<PlanVersionHead[]> {
    if (linkIds.length === 0) return [];
    return db.$queryRaw<PlanVersionHead[]>`
      SELECT DISTINCT ON ("linkId") "linkId", "version", "content", "createdAt"
      FROM "PlanVersion"
      WHERE "linkId" IN (${Prisma.join(linkIds.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY "linkId", "version" DESC`;
  }

  findVersion(linkId: string, version: number, db: Db = this.prisma) {
    return db.planVersion.findFirst({ where: { linkId, version } });
  }

  // Keyset on version: versions are unique per link and dense, so "below the last seen version" is a total order.
  listVersions(linkId: string, before: number | null, take: number, db: Db = this.prisma) {
    return db.planVersion.findMany({
      where: { linkId, ...(before === null ? {} : { version: { lt: before } }) },
      orderBy: { version: 'desc' },
      select: { version: true, createdAt: true },
      take,
    });
  }

  // Unique (linkId, version) is the race guard: a concurrent writer with the same base version fails here.
  insertVersion(tx: Db, data: { linkId: string; version: number; content: PlanContent; createdById: string }) {
    return tx.planVersion.create({ data: { ...data, content: data.content as Prisma.InputJsonValue } });
  }

  // Distinct keys referenced by any entry of the link: the plan may not drop them.
  async scheduledWorkoutKeys(linkId: string, tx: Db): Promise<string[]> {
    const rows = await tx.calendarEntry.findMany({
      where: { linkId },
      distinct: ['workoutKey'],
      select: { workoutKey: true },
    });
    return rows.map((row) => row.workoutKey);
  }

  findEntry(entryId: string, db: Db = this.prisma) {
    return db.calendarEntry.findUnique({ where: { id: entryId } });
  }

  findEntryOfLink(entryId: string, linkId: string, db: Db = this.prisma) {
    return db.calendarEntry.findFirst({ where: { id: entryId, linkId } });
  }

  listEntriesOfLink(linkId: string, range: DateRange, db: Db = this.prisma) {
    return db.calendarEntry.findMany({
      where: { linkId, date: { gte: range.from, lte: range.to } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // range is omitted for the account export, which takes every entry of the client.
  listEntriesOfClient(clientId: string, range: DateRange | null, db: Db = this.prisma) {
    return db.calendarEntry.findMany({
      where: { clientId, ...(range === null ? {} : { date: { gte: range.from, lte: range.to } }) },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createEntry(tx: Db, data: { id: string; linkId: string; clientId: string; date: Date; workoutKey: string }) {
    return tx.calendarEntry.create({ data });
  }

  // Count-based: an entry deleted concurrently is reported as not found, not as a server error.
  async moveEntry(tx: Db, entryId: string, linkId: string, date: Date): Promise<number> {
    const { count } = await tx.calendarEntry.updateMany({ where: { id: entryId, linkId }, data: { date } });
    return count;
  }

  // Count-based: a concurrent delete of the same entry is reported as not found, not as success.
  async deleteEntry(entryId: string, linkId: string, db: Db = this.prisma): Promise<number> {
    const { count } = await db.calendarEntry.deleteMany({ where: { id: entryId, linkId } });
    return count;
  }

  // Entries dated on or after each link's cutoff date; one statement for all links of an account.
  async deleteFutureEntries(tx: Db, cutoffs: readonly { linkId: string; from: Date }[]): Promise<void> {
    if (cutoffs.length === 0) return;
    await tx.calendarEntry.deleteMany({
      where: { OR: cutoffs.map((cutoff) => ({ linkId: cutoff.linkId, date: { gte: cutoff.from } })) },
    });
  }

  // Health data of a deleted client: every calendar entry and plan version of links the client is party to.
  async deleteClientData(tx: Db, clientId: string): Promise<void> {
    await tx.planVersion.deleteMany({ where: { link: { is: { clientId } } } });
    await tx.calendarEntry.deleteMany({ where: { clientId } });
  }
}
