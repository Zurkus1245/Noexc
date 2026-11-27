import { describe, expect, it, vi } from 'vitest';
import { IdentityService } from './identity.service';
import type { IdentityRepository } from './identity.repository';

describe('IdentityService.updateProfile when the account is deleted mid-request', () => {
  it('answers PROFILE_REQUIRED when the user row is already gone', async () => {
    const users = {
      updateUser: vi.fn(async () => Promise.reject(Object.assign(new Error('not found'), { code: 'P2025' }))),
    };
    const service = new IdentityService(users as unknown as IdentityRepository, {} as never, {} as never, {} as never, {} as never, {} as never);

    await expect(service.updateProfile('11111111-1111-4111-8111-111111111111', { displayName: 'Ada' })).rejects.toMatchObject({
      status: 403,
      code: 'PROFILE_REQUIRED',
    });
  });
});
