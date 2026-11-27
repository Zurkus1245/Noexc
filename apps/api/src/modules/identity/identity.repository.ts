import { Injectable } from '@nestjs/common';
import type { CreateProfileRequest, UpdateProfileRequest } from '@noexcuse/contracts';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  createUser(authSubject: string, profile: CreateProfileRequest) {
    return this.prisma.user.create({ data: { authSubject, ...profile } });
  }

  updateUser(userId: string, patch: UpdateProfileRequest) {
    return this.prisma.user.update({ where: { id: userId }, data: patch });
  }

  // One transaction: the foreign module closes its own rows first, then the user row goes.
  // Consents are removed by ON DELETE CASCADE on the user foreign key. Stored responses go both when the user sent
  // them and when they carry the user's data on someone else's request (a coach writing the client's plan).
  deleteAccount(
    userId: string,
    authSubject: string,
    closeForeignRows: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await closeForeignRows(tx);
      await tx.idempotencyRecord.deleteMany({ where: { OR: [{ subject: authSubject }, { dataSubjectId: userId }] } });
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
