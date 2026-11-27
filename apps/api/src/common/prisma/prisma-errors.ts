// Prisma error codes the API branches on. Centralised so that no module compares against a bare literal.
export const PRISMA_UNIQUE_VIOLATION = 'P2002';
export const PRISMA_FOREIGN_KEY_VIOLATION = 'P2003';
export const PRISMA_RECORD_NOT_FOUND = 'P2025';

const errorCodeOf = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

export const isUniqueViolation = (error: unknown): boolean => errorCodeOf(error) === PRISMA_UNIQUE_VIOLATION;

export const isForeignKeyViolation = (error: unknown): boolean => errorCodeOf(error) === PRISMA_FOREIGN_KEY_VIOLATION;

export const isRecordNotFound = (error: unknown): boolean => errorCodeOf(error) === PRISMA_RECORD_NOT_FOUND;
