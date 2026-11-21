// auth.d.ts
import { z } from 'zod';
export declare const AUTH_SUBJECT_MAX_LENGTH = 255;
export declare const LocalTokenRequestSchema: z.ZodObject<{
    subject: z.ZodString;
}, z.core.$strip>;
export type LocalTokenRequest = z.infer<typeof LocalTokenRequestSchema>;
export declare const LocalTokenResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
}, z.core.$strip>;
export type LocalTokenResponse = z.infer<typeof LocalTokenResponseSchema>;

// coaching.d.ts
import { z } from 'zod';
export declare const LINK_STATUSES: readonly ["active", "paused", "ended"];
export declare const LinkStatusSchema: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
    active: "active";
    paused: "paused";
    ended: "ended";
}>, z.ZodLiteral<"unknown">]>>;
export type LinkStatus = z.infer<typeof LinkStatusSchema>;
export declare const ENDED_BY: readonly ["coach", "client", "admin"];
export declare const EndedBySchema: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
    coach: "coach";
    client: "client";
    admin: "admin";
}>, z.ZodLiteral<"unknown">]>>;
export type EndedBy = z.infer<typeof EndedBySchema>;
export declare const CoachClientSchema: z.ZodObject<{
    id: z.ZodUUID;
    coachId: z.ZodNullable<z.ZodUUID>;
    clientId: z.ZodNullable<z.ZodUUID>;
    status: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
        active: "active";
        paused: "paused";
        ended: "ended";
    }>, z.ZodLiteral<"unknown">]>>;
    createdAt: z.ZodISODateTime;
    endedAt: z.ZodNullable<z.ZodISODateTime>;
    endedBy: z.ZodNullable<z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
        coach: "coach";
        client: "client";
        admin: "admin";
    }>, z.ZodLiteral<"unknown">]>>>;
}, z.core.$strip>;
export type CoachClient = z.infer<typeof CoachClientSchema>;
export declare const CoachClientSummarySchema: z.ZodObject<{
    id: z.ZodUUID;
    clientId: z.ZodUUID;
    displayName: z.ZodString;
    status: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
        active: "active";
        paused: "paused";
        ended: "ended";
    }>, z.ZodLiteral<"unknown">]>>;
    createdAt: z.ZodISODateTime;
}, z.core.$strip>;
export type CoachClientSummary = z.infer<typeof CoachClientSummarySchema>;
export declare const CoachClientPageSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        clientId: z.ZodUUID;
        displayName: z.ZodString;
        status: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
            active: "active";
            paused: "paused";
            ended: "ended";
        }>, z.ZodLiteral<"unknown">]>>;
        createdAt: z.ZodISODateTime;
    }, z.core.$strip>>;
    nextCursor: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type CoachClientPage = z.infer<typeof CoachClientPageSchema>;
export declare const CoachClientDetailSchema: z.ZodObject<{
    link: z.ZodObject<{
        id: z.ZodUUID;
        coachId: z.ZodNullable<z.ZodUUID>;
        clientId: z.ZodNullable<z.ZodUUID>;
        status: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
            active: "active";
            paused: "paused";
            ended: "ended";
        }>, z.ZodLiteral<"unknown">]>>;
        createdAt: z.ZodISODateTime;
        endedAt: z.ZodNullable<z.ZodISODateTime>;
        endedBy: z.ZodNullable<z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
            coach: "coach";
            client: "client";
            admin: "admin";
        }>, z.ZodLiteral<"unknown">]>>>;
    }, z.core.$strip>;
    client: z.ZodObject<{
        id: z.ZodUUID;
        displayName: z.ZodString;
        timezone: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CoachClientDetail = z.infer<typeof CoachClientDetailSchema>;
export declare const ClientLinkSummarySchema: z.ZodObject<{
    id: z.ZodUUID;
    coachId: z.ZodNullable<z.ZodUUID>;
    coachDisplayName: z.ZodNullable<z.ZodString>;
    status: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
        active: "active";
        paused: "paused";
        ended: "ended";
    }>, z.ZodLiteral<"unknown">]>>;
    createdAt: z.ZodISODateTime;
}, z.core.$strip>;
export type ClientLinkSummary = z.infer<typeof ClientLinkSummarySchema>;
export declare const ClientLinksPageSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        coachId: z.ZodNullable<z.ZodUUID>;
        coachDisplayName: z.ZodNullable<z.ZodString>;
        status: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
            active: "active";
            paused: "paused";
            ended: "ended";
        }>, z.ZodLiteral<"unknown">]>>;
        createdAt: z.ZodISODateTime;
    }, z.core.$strip>>;
    nextCursor: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type ClientLinksPage = z.infer<typeof ClientLinksPageSchema>;

// common.d.ts
import { z } from 'zod';
export declare const DEFAULT_PAGE_LIMIT = 20;
export declare const MAX_PAGE_LIMIT = 100;
export declare const UNKNOWN_ENUM_VALUE = "unknown";
export declare const UuidSchema: z.ZodUUID;
export type Uuid = z.infer<typeof UuidSchema>;
export declare const IsoDateTimeSchema: z.ZodISODateTime;
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;
export declare const IanaTimezoneSchema: z.ZodString;
export type IanaTimezone = z.infer<typeof IanaTimezoneSchema>;
export declare const PageQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    cursor: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PageQuery = z.infer<typeof PageQuerySchema>;
export declare const cursorPage: <T extends z.ZodType>(item: T) => z.ZodObject<{
    items: z.ZodArray<T>;
    nextCursor: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const tolerantEnum: <const T extends readonly [string, ...string[]]>(values: T) => z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{ [k_1 in T[number]]: k_1; } extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never>, z.ZodLiteral<"unknown">]>>;

// consent.d.ts
import { z } from 'zod';
export declare const CONSENT_TYPES: readonly ["tos", "health_data", "coach_access", "marketing"];
export declare const ConsentTypeSchema: z.ZodEnum<{
    tos: "tos";
    health_data: "health_data";
    coach_access: "coach_access";
    marketing: "marketing";
}>;
export type ConsentType = z.infer<typeof ConsentTypeSchema>;
export declare const CONSENT_VERSIONS: {
    readonly tos: "2026-11-01";
    readonly health_data: "2026-11-01";
    readonly coach_access: "2026-11-01";
    readonly marketing: "2026-11-01";
};
export declare const CONSENT_VERSION_MAX_LENGTH = 32;
export declare const REQUIRED_CONSENT_TYPES: readonly ["tos", "health_data", "coach_access"];
export declare const ConsentSchema: z.ZodObject<{
    id: z.ZodUUID;
    userId: z.ZodUUID;
    type: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
        tos: "tos";
        health_data: "health_data";
        coach_access: "coach_access";
        marketing: "marketing";
    }>, z.ZodLiteral<"unknown">]>>;
    version: z.ZodString;
    granted: z.ZodBoolean;
    createdAt: z.ZodISODateTime;
}, z.core.$strip>;
export type Consent = z.infer<typeof ConsentSchema>;
export declare const GrantConsentRequestSchema: z.ZodObject<{
    type: z.ZodEnum<{
        tos: "tos";
        health_data: "health_data";
        coach_access: "coach_access";
        marketing: "marketing";
    }>;
    version: z.ZodString;
    granted: z.ZodBoolean;
}, z.core.$strip>;
export type GrantConsentRequest = z.infer<typeof GrantConsentRequestSchema>;

// errors.d.ts
import { z } from 'zod';
export declare const ERROR_CODES: readonly ["VALIDATION_FAILED", "UNAUTHENTICATED", "PROFILE_REQUIRED", "PROFILE_EXISTS", "FORBIDDEN_ROLE", "NOT_FOUND", "INVITE_INVALID", "LINK_EXISTS", "INVALID_TRANSITION", "CONSENT_REQUIRED", "RATE_LIMITED", "IDEMPOTENCY_CONFLICT", "INTERNAL"];
export declare const ErrorCodeSchema: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
    VALIDATION_FAILED: "VALIDATION_FAILED";
    UNAUTHENTICATED: "UNAUTHENTICATED";
    PROFILE_REQUIRED: "PROFILE_REQUIRED";
    PROFILE_EXISTS: "PROFILE_EXISTS";
    FORBIDDEN_ROLE: "FORBIDDEN_ROLE";
    NOT_FOUND: "NOT_FOUND";
    INVITE_INVALID: "INVITE_INVALID";
    LINK_EXISTS: "LINK_EXISTS";
    INVALID_TRANSITION: "INVALID_TRANSITION";
    CONSENT_REQUIRED: "CONSENT_REQUIRED";
    RATE_LIMITED: "RATE_LIMITED";
    IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT";
    INTERNAL: "INTERNAL";
}>, z.ZodLiteral<"unknown">]>>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export declare const ValidationIssueSchema: z.ZodObject<{
    path: z.ZodString;
    message: z.ZodString;
}, z.core.$strip>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export declare const ProblemDetailsSchema: z.ZodObject<{
    type: z.ZodString;
    title: z.ZodString;
    status: z.ZodNumber;
    code: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
        VALIDATION_FAILED: "VALIDATION_FAILED";
        UNAUTHENTICATED: "UNAUTHENTICATED";
        PROFILE_REQUIRED: "PROFILE_REQUIRED";
        PROFILE_EXISTS: "PROFILE_EXISTS";
        FORBIDDEN_ROLE: "FORBIDDEN_ROLE";
        NOT_FOUND: "NOT_FOUND";
        INVITE_INVALID: "INVITE_INVALID";
        LINK_EXISTS: "LINK_EXISTS";
        INVALID_TRANSITION: "INVALID_TRANSITION";
        CONSENT_REQUIRED: "CONSENT_REQUIRED";
        RATE_LIMITED: "RATE_LIMITED";
        IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT";
        INTERNAL: "INTERNAL";
    }>, z.ZodLiteral<"unknown">]>>;
    detail: z.ZodString;
    requestId: z.ZodString;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        message: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

// export.d.ts
import { z } from 'zod';
export declare const AccountExportSchema: z.ZodObject<{
    exportedAt: z.ZodISODateTime;
    user: z.ZodObject<{
        id: z.ZodUUID;
        role: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
            coach: "coach";
            client: "client";
        }>, z.ZodLiteral<"unknown">]>>;
        displayName: z.ZodString;
        timezone: z.ZodString;
        createdAt: z.ZodISODateTime;
    }, z.core.$strip>;
    consents: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        userId: z.ZodUUID;
        type: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
            tos: "tos";
            health_data: "health_data";
            coach_access: "coach_access";
            marketing: "marketing";
        }>, z.ZodLiteral<"unknown">]>>;
        version: z.ZodString;
        granted: z.ZodBoolean;
        createdAt: z.ZodISODateTime;
    }, z.core.$strip>>;
    links: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        coachId: z.ZodNullable<z.ZodUUID>;
        clientId: z.ZodNullable<z.ZodUUID>;
        status: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
            active: "active";
            paused: "paused";
            ended: "ended";
        }>, z.ZodLiteral<"unknown">]>>;
        createdAt: z.ZodISODateTime;
        endedAt: z.ZodNullable<z.ZodISODateTime>;
        endedBy: z.ZodNullable<z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
            coach: "coach";
            client: "client";
            admin: "admin";
        }>, z.ZodLiteral<"unknown">]>>>;
    }, z.core.$strip>>;
    invites: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        coachId: z.ZodUUID;
        expiresAt: z.ZodISODateTime;
        usedAt: z.ZodNullable<z.ZodISODateTime>;
        revokedAt: z.ZodNullable<z.ZodISODateTime>;
        createdAt: z.ZodISODateTime;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AccountExport = z.infer<typeof AccountExportSchema>;

// index.d.ts
export * from './auth';
export * from './coaching';
export * from './common';
export * from './consent';
export * from './errors';
export * from './export';
export * from './invite';
export * from './rate-limits';
export * from './user';

// invite.d.ts
import { z } from 'zod';
export declare const INVITE_TTL_HOURS = 168;
export declare const INVITE_CODE_LENGTH = 26;
export declare const InviteCodeSchema: z.ZodString;
export type InviteCode = z.infer<typeof InviteCodeSchema>;
export declare const CreateInviteResponseSchema: z.ZodObject<{
    id: z.ZodUUID;
    code: z.ZodString;
    expiresAt: z.ZodISODateTime;
}, z.core.$strip>;
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>;
export declare const RedeemInviteBodySchema: z.ZodObject<{
    code: z.ZodString;
    consents: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            tos: "tos";
            health_data: "health_data";
            coach_access: "coach_access";
            marketing: "marketing";
        }>;
        version: z.ZodString;
        granted: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RedeemInviteBody = z.infer<typeof RedeemInviteBodySchema>;
export declare const RedeemInviteRequestSchema: z.ZodObject<{
    code: z.ZodString;
    consents: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            tos: "tos";
            health_data: "health_data";
            coach_access: "coach_access";
            marketing: "marketing";
        }>;
        version: z.ZodString;
        granted: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RedeemInviteRequest = z.infer<typeof RedeemInviteRequestSchema>;

// rate-limits.d.ts
export declare const RATE_LIMITS: {
    readonly createInvite: {
        readonly limit: 10;
        readonly windowSeconds: number;
    };
    readonly redeemAttempt: {
        readonly limit: 5;
        readonly windowSeconds: number;
    };
    readonly localTokenIssue: {
        readonly limit: 120;
        readonly windowSeconds: 60;
    };
};

// user.d.ts
import { z } from 'zod';
export declare const ROLES: readonly ["coach", "client"];
export declare const RoleSchema: z.ZodEnum<{
    coach: "coach";
    client: "client";
}>;
export type Role = z.infer<typeof RoleSchema>;
export declare const DISPLAY_NAME_MIN_LENGTH = 1;
export declare const DISPLAY_NAME_MAX_LENGTH = 80;
export declare const DisplayNameSchema: z.ZodString;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodUUID;
    role: z.ZodCatch<z.ZodUnion<readonly [z.ZodEnum<{
        coach: "coach";
        client: "client";
    }>, z.ZodLiteral<"unknown">]>>;
    displayName: z.ZodString;
    timezone: z.ZodString;
    createdAt: z.ZodISODateTime;
}, z.core.$strip>;
export type User = z.infer<typeof UserSchema>;
export declare const CreateProfileRequestSchema: z.ZodObject<{
    role: z.ZodEnum<{
        coach: "coach";
        client: "client";
    }>;
    displayName: z.ZodString;
    timezone: z.ZodString;
}, z.core.$strip>;
export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;
export declare const UpdateProfileRequestSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
