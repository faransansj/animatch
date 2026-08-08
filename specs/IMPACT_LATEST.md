---
type: impact-analysis
context: db-integrity-migration-review
---

## Target
D1 schema migrations 0005–0007 and the database integrity verifier/CI workflow.

## Dependents
- `wrangler.toml`: discovers `migrations/*.sql` for D1.
- `package.json`: `deploy:db` applies the migration chain remotely.
- `functions/api/[[route]].ts`: reads `characters`, `animes`, `analysis_logs`, and `match_feedback`.
- `functions/_middleware.ts`: reads the character identifier and anime metadata for OG responses.
- `db/seed.sql`: canonical data fixture and post-migration smoke input.
- `db/schema.sql`: reference schema contract.
- `scripts/export_embeddings.py`, `db/*` maintenance scripts: consume character/anime columns.
- `.github/workflows/db_check.yml`: CI entry point for validation.

## Test Coverage
- TypeScript suite does not exercise D1 migrations directly.
- `scripts/verify_db_integrity.py` now applies migrations, compares columns/checks/FKs/index definitions with `db/schema.sql`, loads `db/seed.sql`, and runs integrity/FK/action checks.
- Remaining operational gap: the destructive table rebuild must be executed only after the D1 backup/rollback process is confirmed.

## Risk: High
The migration chain is a shared deployment boundary; a syntax error or schema mismatch can block production migrations or leave API queries unusable.

## Implemented action
`0007` now uses a SQLite-compatible table rebuild with preflight validation and preserves the legacy metadata columns from `0004`. The verifier also checks legacy-row preservation, embedding IDs, schema constraints/index definitions, and the real migration path rather than an archival dump.
