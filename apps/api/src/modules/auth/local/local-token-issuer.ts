import { createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { calculateJwkThumbprint, exportJWK, SignJWT, type JWK } from 'jose';
import { type AppConfig, CONFIG } from '../../../config/config';
import { JWT_ALGORITHM } from '../jwks-auth.provider';

const LOCAL_TOKEN_TTL = '1h';
const JWK_USE_SIGNATURE = 'sig';

type SigningMaterial = { privateKey: KeyObject; publicJwk: JWK };

// Local-only issuer (AUTH_MODE=local). Tokens verify through the same JWKS path as managed OIDC.
@Injectable()
export class LocalTokenIssuer {
  private readonly material: Promise<SigningMaterial>;

  constructor(@Inject(CONFIG) private readonly config: AppConfig) {
    this.material = loadSigningMaterial(config.localAuthPrivateKeyPem);
  }

  async issue(subject: string): Promise<string> {
    const { privateKey, publicJwk } = await this.material;
    return new SignJWT({})
      .setProtectedHeader({ alg: JWT_ALGORITHM, kid: publicJwk.kid })
      .setIssuer(this.config.auth.issuer)
      .setAudience(this.config.auth.audience)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime(LOCAL_TOKEN_TTL)
      .sign(privateKey);
  }

  async jwks(): Promise<{ keys: JWK[] }> {
    const { publicJwk } = await this.material;
    return { keys: [publicJwk] };
  }
}

async function loadSigningMaterial(pem: string | undefined): Promise<SigningMaterial> {
  if (pem === undefined) {
    throw new Error('LOCAL_AUTH_PRIVATE_KEY_PEM is required when AUTH_MODE=local');
  }
  const privateKey = createPrivateKey(pem);
  const jwk = await exportJWK(createPublicKey(privateKey));
  const kid = await calculateJwkThumbprint(jwk);
  return { privateKey, publicJwk: { ...jwk, kid, alg: JWT_ALGORITHM, use: JWK_USE_SIGNATURE } };
}
