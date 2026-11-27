# 0008 Market: Russia, personal data stored in Russia

Status: accepted (founder decision, 2026-11-27). Supersedes the EU market and hosting parts of CLAUDE.md §3, §9 and ADR 0002.
Adds no dependency. Legal points below must be confirmed by a lawyer practising 152-FZ before production launch.

## Context
CLAUDE.md fixed the market as EU with EU hosting. The founder chose Russia as the launch market. Russian personal data law
(152-FZ) requires the primary recording, storage and updating of personal data of Russian citizens in databases located
in Russia (art. 18 part 5), and treats health data as a special category that needs separate consent (art. 10).
Health and body data (weight, injuries, plans, training) is treated as health data in full, as before.

## Decision
- Market: Russia. Production hosting, managed Postgres and S3-compatible storage run in a Russian region
  (candidates: Yandex Cloud, Selectel, VK Cloud). The specific vendor is chosen in a separate ADR before deployment.
- Every vendor that touches personal data either hosts it in Russia or receives none of it. Each such vendor works
  under a data-processing instruction (поручение на обработку ПД).
- Auth: managed OIDC hosted in Russia behind the existing `AuthProvider` adapter; Sign in with Apple stays mandatory with
  any social login. Observability: Sentry hosted in Russia (self-hosted) or another RF-hosted tool behind the adapter,
  PII scrubbing on.
- Push (APNs/FCM) and the app stores are foreign services: they receive no personal or health data. Push text stays generic.
- Health data rules (separate versioned consent, minimization, export and account deletion, audited admin access, no PII
  in logs, analytics, lockscreen push or errors) stay as they are; only the legal basis changes from GDPR to 152-FZ.
- Before launch: notification to Roskomnadzor about personal data processing (art. 22, exemptions to verify), a privacy
  policy and consent texts under 152-FZ, and a check of the cross-border transfer rules for any foreign vendor.
- EU users are out of scope. Serving them later needs a second, EU-hosted deployment and its own ADR.

## Consequences
- The architecture does not change: the API stays stateless, all vendors are behind adapters, so the region is a
  deployment choice.
- CLAUDE.md §3 and §9 are updated to Russia. ADR 0002 keeps the local-first stage; its EU hosting line is superseded.
- Follow-up: revise `docs/requirements/03-nfr.md` §8–9 (written against GDPR) to 152-FZ terms, and choose the hosting
  vendor in its own ADR.
