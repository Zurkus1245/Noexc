import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_DATA_SUBJECT_KEY = 'idempotency:data-subject-param';

// WHY: a stored response may carry another user's health data (a coach saving a client's plan stores it under the
// coach's subject). Naming the route parameter that identifies that user tags the record, so deleting the user's
// account also deletes every stored response about them (GDPR art. 17), while replay keeps working until then.
export const IdempotentDataSubject = (routeParam: string) => SetMetadata(IDEMPOTENT_DATA_SUBJECT_KEY, routeParam);
