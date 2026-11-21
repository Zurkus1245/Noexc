export type VerifiedToken = { subject: string };

// The single seam for identity verification: local issuer and managed OIDC both satisfy it via JWKS.
export interface AuthProvider {
  verifyAccessToken(token: string): Promise<VerifiedToken>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
