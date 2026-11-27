import { Injectable } from '@nestjs/common';
import type { IdempotencyRecord, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export type RecordKey = { subject: string; key: string };

export type NewRecord = RecordKey & { requestHash: string; createdAt: Date; expiresAt: Date; dataSubjectId: string | null };

@Injectable()
export class IdempotencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  find({ subject, key }: RecordKey): Promise<IdempotencyRecord | null> {
    return this.prisma.idempotencyRecord.findUnique({ where: { subject_key: { subject, key } } });
  }

  insert(record: NewRecord): Promise<IdempotencyRecord> {
    return this.prisma.idempotencyRecord.create({ data: record });
  }

  complete({ subject, key }: RecordKey, status: number, body: Prisma.InputJsonValue | null): Promise<unknown> {
    return this.prisma.idempotencyRecord.update({
      where: { subject_key: { subject, key } },
      data: { responseStatus: status, responseBody: body ?? undefined },
    });
  }

  // Removes the caller's own failed reservation. deleteMany: releasing a key that is already gone is not an error.
  async release({ subject, key }: RecordKey): Promise<void> {
    await this.prisma.idempotencyRecord.deleteMany({ where: { subject, key } });
  }

  // Conditional on expiry: a read that found an expired row must not delete a fresh reservation made since then.
  async releaseExpired({ subject, key }: RecordKey, now: Date): Promise<void> {
    await this.prisma.idempotencyRecord.deleteMany({ where: { subject, key, expiresAt: { lte: now } } });
  }
}
