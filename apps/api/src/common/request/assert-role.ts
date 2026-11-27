import type { Role, User } from '@noexcuse/contracts';
import { ApiError } from '../errors/api-error';

const FORBIDDEN_STATUS = 403;

export function assertRole(user: User, role: Role): void {
  if (user.role !== role) {
    throw new ApiError(FORBIDDEN_STATUS, 'FORBIDDEN_ROLE', `This action requires the ${role} role`);
  }
}
