import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import type { LinkCursor } from './pagination';

export type Db = Prisma.TransactionClient;

export type InviteLock = {
  id: string;
  coachId: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

// Rows strictly after the cursor in the (createdAt desc, id desc) order used by every link list.
const keysetAfter = (after: LinkCursor | null): Prisma.CoachClientWhereInput =>
  after === null
    ? {}
    : { OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] };

// Owns the CoachClient and Invite tables. Consents and user profiles belong to other modules.
@Injectable()
export class CoachingRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  createInvite(data: { coachId: string; codeHash: string; createdAt: Date; expiresAt: Date }) {
    return this.prisma.invite.create({ data, select: { id: true, expiresAt: true } });
  }

  findOwnInvite(inviteId: string, coachId: string) {
    return this.prisma.invite.findFirst({ where: { id: inviteId, coachId }, select: { id: true, revokedAt: true } });
  }

  async revokeInvite(inviteId: string, revokedAt: Date): Promise<void> {
    await this.prisma.invite.updateMany({ where: { id: inviteId, revokedAt: null }, data: { revokedAt } });
  }

  // SELECT ... FOR UPDATE: concurrent redeems of one code serialize, so the second sees the first's usedAt.
  async lockInviteByCodeHash(tx: Db, codeHash: string): Promise<InviteLock | null> {
    const [row] = await tx.$queryRaw<InviteLock[]>`
      SELECT "id", "coachId", "expiresAt", "usedAt", "revokedAt"
      FROM "Invite" WHERE "codeHash" = ${codeHash} FOR UPDATE`;
    return row ?? null;
  }

  markInviteUsed(tx: Db, inviteId: string, usedAt: Date) {
    return tx.invite.update({ where: { id: inviteId }, data: { usedAt } });
  }

  findOpenLink(coachId: string, clientId: string, db: Db = this.prisma) {
    return db.coachClient.findFirst({ where: { coachId, clientId, status: { not: 'ended' } } });
  }

  createActiveLink(tx: Db, coachId: string, clientId: string) {
    return tx.coachClient.create({ data: { coachId, clientId, status: 'active' } });
  }

  findLinkById(linkId: string, db: Db = this.prisma) {
    return db.coachClient.findUnique({ where: { id: linkId } });
  }

  updateLink(tx: Db, linkId: string, data: Prisma.CoachClientUpdateInput) {
    return tx.coachClient.update({ where: { id: linkId }, data });
  }

  // Advisory locks per link, taken in link-id order so that multi-link transactions cannot deadlock each other.
  // Plan and calendar writers take the same lock for their link; they re-read the link status under it.
  async lockLinks(tx: Db, linkIds: readonly string[]): Promise<void> {
    for (const linkId of [...linkIds].sort()) {
      // $executeRaw: the lock function returns void, which a raw query cannot deserialize.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${linkId}::text, 0))`;
    }
  }

  // Every link of the client, ended ones included: the client's calendar keeps the past of ended links.
  // Only the columns the plan and calendar reads need.
  listAllLinksOfClient(clientId: string) {
    return this.prisma.coachClient.findMany({
      where: { clientId },
      select: { id: true, coachId: true, clientId: true, status: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
  listOpenLinksOfCoach(coachId: string, after: LinkCursor | null, take: number) {
    return this.prisma.coachClient.findMany({
      where: { coachId, status: { not: 'ended' }, ...keysetAfter(after) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  // Ended links stay visible to their client, so this list is not filtered by status.
  listLinksOfClient(clientId: string, after: LinkCursor | null, take: number) {
    return this.prisma.coachClient.findMany({
      where: { clientId, ...keysetAfter(after) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  // Ended links are closed and open invites revoked before the user row is deleted in the same transaction.
  async closeLinksOf(userId: string, endedAt: Date, tx: Db): Promise<void> {
    await tx.coachClient.updateMany({
      where: { clientId: userId, status: { not: 'ended' } },
      data: { status: 'ended', endedAt, endedBy: 'client' },
    });
    await tx.coachClient.updateMany({
      where: { coachId: userId, status: { not: 'ended' } },
      data: { status: 'ended', endedAt, endedBy: 'coach' },
    });
    await tx.invite.updateMany({
      where: { coachId: userId, usedAt: null, revokedAt: null },
      data: { revokedAt: endedAt },
    });
  }

  // Both sides of the account: a user is in the export as coach or as client.
  listLinksOf(userId: string, db: Db = this.prisma) {
    return db.coachClient.findMany({
      where: { OR: [{ coachId: userId }, { clientId: userId }] },
      orderBy: { createdAt: 'asc' },
    });
  }

  // select: the invite code hash is a credential-equivalent secret and is never read here.
  listInvitesOf(coachId: string) {
    return this.prisma.invite.findMany({
      where: { coachId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, coachId: true, expiresAt: true, usedAt: true, revokedAt: true, createdAt: true },
    });
  }
}
