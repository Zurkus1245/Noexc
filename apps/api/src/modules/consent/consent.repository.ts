import { Injectable } from '@nestjs/common';
import type { ConsentType, GrantConsentRequest } from '@noexcuse/contracts';
import type { ConsentEntry, ConsentRecord } from '@noexcuse/domain';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

export type ConsentDb = Prisma.TransactionClient;

// The only code that touches the Consent table.
@Injectable()
export class ConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.consent.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  // Append-only: a consent decision is never edited, the latest row per type is the current one.
  append(userId: string, grant: GrantConsentRequest) {
    return this.prisma.consent.create({ data: { userId, ...grant } });
  }

  // Every decision in one request shares the timestamp, so array order breaks the tie.
  appendMany(tx: ConsentDb, userId: string, entries: readonly ConsentEntry[], createdAt: Date) {
    return tx.consent.createMany({
      data: entries.map((entry) => ({ userId, type: entry.type, version: entry.version, granted: entry.granted, createdAt })),
    });
  }

  findOfUser(userId: string, types: readonly ConsentType[]): Promise<ConsentRecord[]> {
    return this.prisma.consent.findMany({
      where: { userId, type: { in: [...types] } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // One query for a whole page of users; rows carry userId so the caller can group them.
  findOfUsers(userIds: readonly string[], types: readonly ConsentType[]): Promise<(ConsentRecord & { userId: string })[]> {
    return this.prisma.consent.findMany({
      where: { userId: { in: [...userIds] }, type: { in: [...types] } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
