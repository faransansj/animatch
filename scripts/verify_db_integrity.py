#!/usr/bin/env python3
"""Apply the D1 migrations to a clean SQLite database and validate the seed."""

from __future__ import annotations

import gzip
import json
import math
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "migrations"
SCHEMA_PATH = ROOT / "db" / "schema.sql"
SEED_PATH = ROOT / "db" / "seed.sql"
EMBEDDINGS_PATH = ROOT / "public" / "embeddings.json"
EMBEDDINGS_GZIP_PATH = ROOT / "public" / "embeddings.json.gz"
CHECKS_PATH = ROOT / "scripts" / "db_integrity_check.sql"
EMBEDDING_DIM = 512
TABLES = ("animes", "characters", "analysis_logs", "match_feedback")


def read_sql(path: Path) -> str:
    if not path.is_file():
        raise FileNotFoundError(path)
    return path.read_text(encoding="utf-8")


def split_statements(sql: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []

    for line in sql.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("--") or stripped.startswith("."):
            continue
        current.append(line)
        candidate = "\n".join(current)
        if sqlite3.complete_statement(candidate):
            statements.append(candidate.strip())
            current.clear()

    if current:
        raise ValueError("SQL file ended with an incomplete statement")
    return statements


def apply_migrations(conn: sqlite3.Connection) -> None:
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        print(f"Applying {path.relative_to(ROOT)}")
        conn.executescript(read_sql(path))


def validate_legacy_rebuild() -> None:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name.startswith("0007_"):
                break
            conn.executescript(read_sql(path))
        conn.execute(
            "INSERT INTO animes (title_ko, title_en, title_ja, title_zh_tw, genre, orientation, tier) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("Legacy", "Legacy", "旧", "舊", "[]", "female", 2),
        )
        conn.execute(
            "INSERT INTO characters (anime_id, name_ko, name_en, name_ja, name_zh_tw, image_url, "
            "personality_en, tags_en, gender, role, charm_en, heroine_id_original) "
            "VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("Legacy 1", "Legacy 1", "旧1", "舊1", "image", "[]", "[]", "male", "protagonist", "charm", 101),
        )
        conn.execute(
            "INSERT INTO characters (anime_id, name_ko, name_en, name_ja, name_zh_tw, image_url, "
            "personality_en, tags_en, gender, role, partner_id, charm_en, heroine_id_original) "
            "VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("Legacy 2", "Legacy 2", "旧2", "舊2", "image", "[]", "[]", "female", "heroine", 1, "charm", 102),
        )
        conn.execute("UPDATE characters SET partner_id = 2 WHERE id = 1")
        conn.executescript(read_sql(MIGRATIONS_DIR / "0007_foreign_keys.sql"))
        preserved = conn.execute(
            "SELECT title_ja, title_zh_tw FROM animes WHERE id = 1"
        ).fetchone()
        if preserved != ("旧", "舊"):
            raise ValueError("0007 did not preserve legacy anime translations")
        preserved = conn.execute(
            "SELECT name_ja, name_zh_tw, charm_en, heroine_id_original "
            "FROM characters WHERE id = 1"
        ).fetchone()
        if preserved != ("旧1", "舊1", "charm", 101):
            raise ValueError("0007 did not preserve legacy character metadata")
        if conn.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("0007 produced invalid legacy foreign keys")
    finally:
        conn.close()


def extract_checks(sql: str) -> tuple[str, ...]:
    checks: list[str] = []
    for match in re.finditer(r"\bCHECK\s*\(", sql, re.IGNORECASE):
        depth = 1
        quote = False
        end = match.end()
        while end < len(sql) and depth:
            char = sql[end]
            if char == "'":
                if quote and end + 1 < len(sql) and sql[end + 1] == "'":
                    end += 2
                    continue
                quote = not quote
            elif not quote:
                depth += char == "("
                depth -= char == ")"
            end += 1
        if depth:
            raise ValueError("unclosed CHECK constraint")
        checks.append(" ".join(sql[match.end():end - 1].split()).upper())
    return tuple(sorted(checks))


def signature(conn: sqlite3.Connection, table: str) -> tuple:
    columns = tuple(
        (row[1], row[2], row[3], row[4], row[5])
        for row in conn.execute(f"PRAGMA table_info({table})")
    )
    foreign_keys = tuple(
        sorted(
            (row[2], row[3], row[4], row[5], row[6], row[7])
            for row in conn.execute(f"PRAGMA foreign_key_list({table})")
        )
    )
    indexes = []
    for row in conn.execute(f"PRAGMA index_list({table})"):
        index_columns = tuple(info[2] for info in conn.execute(f"PRAGMA index_info({row[1]})"))
        indexes.append((row[1], row[2], row[4], index_columns))
    sql = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)
    ).fetchone()[0]
    return columns, foreign_keys, tuple(sorted(indexes)), extract_checks(sql)


def validate_schema(conn: sqlite3.Connection) -> None:
    reference = sqlite3.connect(":memory:")
    try:
        reference.executescript(read_sql(SCHEMA_PATH))
        for table in TABLES:
            if signature(conn, table) != signature(reference, table):
                raise ValueError(f"migration schema differs from db/schema.sql: {table}")
    finally:
        reference.close()


def validate_embedding_ids(conn: sqlite3.Connection) -> None:
    data = json.loads(read_sql(EMBEDDINGS_PATH))
    entries = data["characters"]
    embedding_dim = data["embedding_dim"]
    if embedding_dim != EMBEDDING_DIM:
        raise ValueError(f"expected {EMBEDDING_DIM}d CLIP embeddings, got {embedding_dim}")
    if gzip.decompress(EMBEDDINGS_GZIP_PATH.read_bytes()) != read_sql(EMBEDDINGS_PATH).encode("utf-8"):
        raise ValueError("public/embeddings.json.gz is stale or corrupt")
    heroine_ids = [entry["heroine_id"] for entry in entries]
    if len(heroine_ids) != len(set(heroine_ids)):
        raise ValueError("public/embeddings.json contains duplicate heroine_id values")
    for entry in entries:
        for field, expected_dim in (("embedding", embedding_dim), ("arcface_embedding", 512)):
            vector = entry.get(field)
            if vector is None and field == "arcface_embedding":
                continue
            if not isinstance(vector, list) or len(vector) != expected_dim:
                raise ValueError(f"{field} has an invalid dimension")
            if any(not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) for value in vector):
                raise ValueError(f"{field} contains a non-finite or non-numeric value")
    db_roles = dict(conn.execute("SELECT id, role FROM characters"))
    missing = sorted(set(heroine_ids) - db_roles.keys())
    if missing:
        raise ValueError(f"embedding heroine_id values missing from characters: {missing[:5]}")
    non_heroines = sorted(heroine_id for heroine_id in heroine_ids if db_roles[heroine_id] != "heroine")
    if non_heroines:
        raise ValueError(f"embedding heroine_id values are not heroines: {non_heroines[:5]}")


def validate_pragmas(conn: sqlite3.Connection) -> None:
    integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        raise ValueError(f"PRAGMA integrity_check failed: {integrity}")

    foreign_key_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
    if foreign_key_errors:
        raise ValueError(f"PRAGMA foreign_key_check found {len(foreign_key_errors)} issue(s)")


def validate_foreign_key_actions(conn: sqlite3.Connection) -> None:
    conn.execute("SAVEPOINT fk_actions")
    try:
        conn.execute("DELETE FROM characters WHERE id = 1")
        partner = conn.execute("SELECT partner_id FROM characters WHERE id = 2").fetchone()
        if partner != (None,):
            raise ValueError("partner delete action is not ON DELETE SET NULL")
        conn.execute("ROLLBACK TO fk_actions")

        conn.execute("DELETE FROM animes WHERE id = 1")
        remaining = conn.execute("SELECT COUNT(*) FROM characters WHERE anime_id = 1").fetchone()[0]
        if remaining != 0:
            raise ValueError("anime delete action is not ON DELETE CASCADE")
    finally:
        conn.execute("ROLLBACK TO fk_actions")
        conn.execute("RELEASE fk_actions")


def run_integrity_checks(conn: sqlite3.Connection) -> int:
    total_issues = 0
    for query in split_statements(read_sql(CHECKS_PATH)):
        rows = conn.execute(query).fetchall()
        if rows:
            issue = rows[0][0]
            print(f"FAIL {issue}: {len(rows)} issue(s)")
            total_issues += len(rows)
        else:
            print(f"PASS {query.split()[1]}")
    return total_issues


def main() -> int:
    print("--- Initializing D1 migration integrity check ---")
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        print("Validating legacy 0005 -> 0007 rebuild")
        validate_legacy_rebuild()
        apply_migrations(conn)
        validate_schema(conn)
        conn.executescript(read_sql(SEED_PATH))
        validate_embedding_ids(conn)
        validate_pragmas(conn)
        validate_foreign_key_actions(conn)
        issues = run_integrity_checks(conn)
        if issues:
            print(f"\nIntegrity checks failed: {issues} issue(s)")
            return 1
        print("\nAll migration and data integrity checks passed")
        return 0
    except (FileNotFoundError, sqlite3.Error, ValueError) as error:
        print(f"\nIntegrity check failed: {error}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
