import { Inject, Injectable } from '@nestjs/common';
import type { AccountExport, CreateProfileRequest, UpdateProfileRequest, User } from '@noexcuse/contracts';
import { ApiError } from '../../common/errors/api-error';
import { isRecordNotFound, isUniqueViolation } from '../../common/prisma/prisma-errors';
import { CLOCK, type Clock } from '../../common/clock/clock';
import { ConsentService } from '../consent/consent.service';
import { CoachingService } from '../coaching/coaching.service';
import { profileRequired, SessionService } from '../auth/session/session.service';
import { toUser } from '../auth/session/user.mapper';
import { PlansService } from '../plans/plans.service';
import { IdentityRepository } from './identity.repository';

const CONFLICT_STATUS = 409;

@Injectable()
export class IdentityService {
  constructor(
    private readonly users: IdentityRepository,
    private readonly coaching: CoachingService,
    private readonly consents: ConsentService,
    private readonly session: SessionService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly plans: PlansService,
  ) {}

  async createProfile(authSubject: string, profile: CreateProfileRequest): Promise<User> {
    if ((await this.session.findProfileBySubject(authSubject)) !== null) throw profileExists();
    try {
      return toUser(await this.users.createUser(authSubject, profile));
    } catch (error) {
      // Two concurrent creates for one subject: the unique index decides, the loser gets the same answer.
      if (isUniqueViolation(error)) throw profileExists();
      throw error;
    }
  }

  async updateProfile(userId: string, patch: UpdateProfileRequest): Promise<User> {
    try {
      return toUser(await this.users.updateUser(userId, patch));
    } catch (error) {
      // The account was deleted after the caller authenticated: the row to update is gone.
      if (isRecordNotFound(error)) throw profileRequired();
      throw error;
    }
  }

  async exportAccount(user: User): Promise<AccountExport> {
    const [consents, coaching] = await Promise.all([this.consents.list(user.id), this.coaching.exportAccountData(user.id)]);
    const health = await this.plans.exportClientData(user.id, coaching.links);
    return {
      exportedAt: this.clock.now().toISOString(),
      user,
      consents,
      links: coaching.links,
      invites: coaching.invites,
      plans: health.plans,
      calendarEntries: health.calendarEntries,
    };
  }

  async deleteAccount(userId: string, authSubject: string): Promise<void> {
    await this.users.deleteAccount(userId, authSubject, (tx) => this.coaching.closeAllForUser(userId, tx));
  }
}

function profileExists(): ApiError {
  return new ApiError(CONFLICT_STATUS, 'PROFILE_EXISTS', 'A profile already exists for this account');
}
