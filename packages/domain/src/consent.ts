import { CONSENT_VERSIONS, REQUIRED_CONSENT_TYPES, type ConsentType } from '@noexcuse/contracts';

export type ConsentRecord = {
  type: ConsentType;
  version: string;
  granted: boolean;
  createdAt: Date;
};

export type ConsentEntry = Pick<ConsentRecord, 'type' | 'version' | 'granted'>;

const isCurrentGrant = (entry: ConsentEntry): boolean =>
  entry.granted && entry.version === CONSENT_VERSIONS[entry.type];

// Ties resolve to the later array entry: the log is append-only, so insertion order breaks equal timestamps.
export function currentConsents(records: readonly ConsentRecord[]): ReadonlyMap<ConsentType, ConsentRecord> {
  const latest = new Map<ConsentType, ConsentRecord>();
  for (const record of records) {
    const previous = latest.get(record.type);
    if (previous === undefined || record.createdAt.getTime() >= previous.createdAt.getTime()) {
      latest.set(record.type, record);
    }
  }
  return latest;
}

export function hasValidConsent(records: readonly ConsentRecord[], type: ConsentType): boolean {
  const current = currentConsents(records).get(type);
  return current !== undefined && isCurrentGrant(current);
}

// Every entry for a required type must be a current grant: a contradictory request is not explicit consent.
export function missingRequiredForRedeem(consentsInRequest: readonly ConsentEntry[]): ConsentType[] {
  return REQUIRED_CONSENT_TYPES.filter((type) => {
    const entries = consentsInRequest.filter((entry) => entry.type === type);
    return entries.length === 0 || !entries.every(isCurrentGrant);
  });
}
