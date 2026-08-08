# Database Management & Integrity Rules

This document defines the strict rules and workflows for managing the AniMatch database to prevent schema drift and ensure data integrity.

## 1. Schema Authority (Single Source of Truth)
- **Reference Schema:** `db/schema.sql` is the definitive source of truth for the database structure.
- **Migration Priority:** No changes should be made directly to the database via GUI or ad-hoc commands. All changes MUST be implemented through numbered migration files in the `migrations/` directory.
- **Synchronization:** Any change made in a migration file must be immediately reflected in `db/schema.sql`.

## 2. Migration Workflow
- **Naming Convention:** Migration files must follow the `000X_description.sql` format (e.g., `0006_add_user_preferences.sql`).
- **Idempotency:** Use `IF NOT EXISTS` for table and index creation to prevent errors during repeated applications.
- **Atomic Changes:** Each migration file should focus on one logical change (e.g., adding a feature or fixing a bug) to ensure easier rollbacks and debugging.
- **Deployment:** Run the local gate first, then use the designated script:
  ```bash
  python scripts/verify_db_integrity.py
  pnpm run deploy:db
  ```
- **Rebuild Safety:** Migration `0007` rebuilds tables inside D1's migration transaction; do not bypass Wrangler or apply it with ad-hoc SQL.

## 3. Data Integrity Constraints
- **Referential Integrity:**
    - `characters.anime_id` must always point to a valid `animes.id`.
    - `characters.partner_id` must point to a valid `characters.id` (Self-reference).
- **Data Types:**
    - JSON arrays (genres, personality, tags) must be stored as `TEXT` and validated at the application level using Zod.
    - Timestamps must use `datetime('now')` format for consistency.
- **Constraint Checks:**
    - `orientation` must be strictly `male` or `female`.
    - `tier` must be strictly `1`, `2`, or `3`.
    - `role` must be strictly `protagonist` or `heroine`.

## 4. Seeding & Maintenance
- **Seeding Process:** All seed data must be managed via `db/seed.sql` or dedicated seeding scripts.
- **Order of Insertion:** To maintain foreign key integrity, data must be inserted in this order:
    1. `animes` $\rightarrow$ 2. `characters` $\rightarrow$ 3. `analysis_logs`/`match_feedback`.
- **Regular Audits:** Periodically run `PRAGMA integrity_check` and `PRAGMA foreign_key_check` on development environments before deploying to production.

## 5. Verification
- **Local Gate:** Run `python scripts/verify_db_integrity.py` before applying migrations.
- **What It Covers:** The verifier applies every migration to an in-memory SQLite database, compares columns/checks/FKs/index definitions with `db/schema.sql`, loads `db/seed.sql`, validates `public/embeddings.json` IDs, and runs `PRAGMA integrity_check` plus `PRAGMA foreign_key_check`.
- **Legacy Dumps:** `db/updated_animatch.sql` and `db/cleaned_animatch.sql` are archival exports, not migration fixtures. They do not represent the D1 migration history.
- **Migration Preconditions:** If migration `0007` rejects existing rows, backfill the missing enum metadata before retrying; do not weaken the canonical constraints.

## 6. Security & Performance
- **No Secrets:** Never store API keys, passwords, or sensitive credentials within the database.
- **Indexing Strategy:**
    - Every foreign key column must have an associated index to prevent full table scans during joins.
    - Frequently filtered columns (e.g., `created_at`, `orientation`, `role`) must be indexed.
