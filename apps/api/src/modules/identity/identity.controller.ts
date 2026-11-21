import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, UseInterceptors } from '@nestjs/common';
import {
  type AccountExport,
  CreateProfileRequestSchema,
  type CreateProfileRequest,
  UpdateProfileRequestSchema,
  type UpdateProfileRequest,
  type User,
} from '@noexcuse/contracts';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { IdempotencyInterceptor } from '../../infra/idempotency/idempotency.interceptor';
import { CurrentSubject, CurrentUser } from '../auth/session/current-user.decorator';
import { IdentityService } from './identity.service';

@Controller('me')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  createProfile(
    @CurrentSubject() subject: string,
    @Body(new ZodValidationPipe(CreateProfileRequestSchema)) body: CreateProfileRequest,
  ): Promise<User> {
    return this.identity.createProfile(subject, body);
  }

  @Get()
  getProfile(@CurrentUser() user: User): User {
    return user;
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(UpdateProfileRequestSchema)) body: UpdateProfileRequest,
  ): Promise<User> {
    return this.identity.updateProfile(user.id, body);
  }

  @Get('export')
  exportAccount(@CurrentUser() user: User): Promise<AccountExport> {
    return this.identity.exportAccount(user);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: User, @CurrentSubject() subject: string): Promise<void> {
    await this.identity.deleteAccount(user.id, subject);
  }
}
