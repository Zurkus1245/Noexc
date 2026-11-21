import { Injectable } from '@nestjs/common';
import type { Consent, ConsentType, GrantConsentRequest } from '@noexcuse/contracts';
import type { ConsentEntry, ConsentRecord } from '@noexcuse/domain';
import { type ConsentDb, ConsentRepository } from './consent.repository';
import { toConsent } from './consent.mapper';

// Owner of the Consent table. Other modules read consents and append them only through this service.
@Injectable()
export class ConsentService {
  constructor(private readonly repo: ConsentRepository) {}

  async list(userId: string): Promise<Consent[]> {
    return (await this.repo.list(userId)).map(toConsent);
  }

  async grant(userId: string, grant: GrantConsentRequest): Promise<Consent> {
    return toConsent(await this.repo.append(userId, grant));
  }

  // Runs inside the caller's transaction, so a consent is never recorded without the action it authorises.
  appendInTransaction(tx: ConsentDb, userId: string, entries: readonly ConsentEntry[], createdAt: Date): Promise<unknown> {
    return this.repo.appendMany(tx, userId, entries, createdAt);
  }

  findConsents(userId: string, types: readonly ConsentType[]): Promise<ConsentRecord[]> {
    return this.repo.findOfUser(userId, types);
  }

  findConsentsOfUsers(userIds: readonly string[], types: readonly ConsentType[]): Promise<(ConsentRecord & { userId: string })[]> {
    return this.repo.findOfUsers(userIds, types);
  }
}
