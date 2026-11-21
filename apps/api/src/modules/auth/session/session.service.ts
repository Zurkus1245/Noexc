import { Injectable } from '@nestjs/common';
import type { User } from '@noexcuse/contracts';
import { ApiError } from '../../../common/errors/api-error';
import { SessionRepository } from './session.repository';
import { toUser } from './user.mapper';

const FORBIDDEN_STATUS = 403;

// Display fields of any user. Safe to show to a party of a link; never includes the auth subject.
export type PublicProfile = { id: string; displayName: string; timezone: string };

// The caller's profile behind a verified subject, and display data of other users. Identity and coaching
// both depend on this; neither depends on the other.
@Injectable()
export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  async findProfileBySubject(authSubject: string): Promise<User | null> {
    const row = await this.repo.findUserBySubject(authSubject);
    return row === null ? null : toUser(row);
  }

  async requireProfile(authSubject: string): Promise<User> {
    const profile = await this.findProfileBySubject(authSubject);
    if (profile === null) {
      throw new ApiError(FORBIDDEN_STATUS, 'PROFILE_REQUIRED', 'Create a profile first');
    }
    return profile;
  }

  // Batch lookup: one query for a whole page. Users that no longer exist are absent from the map.
  async findPublicProfiles(userIds: readonly string[]): Promise<Map<string, PublicProfile>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.repo.findPublicProfiles(userIds);
    return new Map(rows.map((row) => [row.id, row]));
  }
}
