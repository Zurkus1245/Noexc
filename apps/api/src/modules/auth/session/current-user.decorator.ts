import { createParamDecorator, Injectable, type ExecutionContext, type PipeTransform } from '@nestjs/common';
import type { User } from '@noexcuse/contracts';
import { type RequestWithContext, requireSubject } from '../../../common/request/request-context';
import { SessionService } from './session.service';

// Resolves the authenticated subject to its profile; without a profile the route answers PROFILE_REQUIRED.
@Injectable()
export class ResolveCurrentUserPipe implements PipeTransform<string, Promise<User>> {
  constructor(private readonly session: SessionService) {}

  transform(subject: string): Promise<User> {
    return this.session.requireProfile(subject);
  }
}

const SubjectParam = createParamDecorator((_data: unknown, context: ExecutionContext): string =>
  requireSubject(context.switchToHttp().getRequest<RequestWithContext>()),
);

// For routes that act before a profile exists (POST /v1/me) or on the account identity itself.
export const CurrentSubject = () => SubjectParam();

export const CurrentUser = () => SubjectParam(undefined, ResolveCurrentUserPipe);
