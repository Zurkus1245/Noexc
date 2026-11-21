import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

// Read-only access to the user row; writes stay with the identity module.
@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserBySubject(authSubject: string) {
    return this.prisma.user.findUnique({ where: { authSubject } });
  }

  findPublicProfiles(userIds: readonly string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true, timezone: true },
    });
  }
}
