# NoExcuse

Coach and client platform. Monorepo: pnpm workspaces + Turborepo. See `CLAUDE.md` and `docs/`.

## Prerequisites
- Node 24 (see `.nvmrc`)
- pnpm 10.34.9 (`corepack enable` picks the version pinned in `package.json`)
- Docker (for local PostgreSQL 17)

## Start locally
```sh
cp .env.example .env
```
Edit `.env`: set `POSTGRES_PASSWORD` and the password in `DATABASE_URL` to the same value, and set
`LOCAL_AUTH_PRIVATE_KEY_PEM` to an RSA private key on one line with `\n` escapes:
```sh
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048
```

```sh
docker compose up -d
pnpm install
pnpm test
```

## Scripts
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`: run via Turborepo across packages
- `pnpm format`: Prettier write over the repo
