---
name: database-migrations
description: Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments. Focused on Prisma/PostgreSQL patterns used in MakeForest.
origin: ECC (adapted for MakeForest)
---

# Database Migration Patterns

Safe, reversible database schema changes for production systems.

## When to Activate

- Creating or altering database tables
- Adding/removing columns or indexes
- Running data migrations (backfill, transform)
- Planning zero-downtime schema changes

## Core Principles

1. **Every change is a migration** — never alter production databases manually
2. **Migrations are forward-only in production** — rollbacks use new forward migrations
3. **Schema and data migrations are separate** — never mix DDL and DML in one migration
4. **Test migrations against production-sized data**
5. **Migrations are immutable once deployed** — never edit a migration that has run in production

## Migration Safety Checklist

- [ ] New columns have defaults or are nullable (never add NOT NULL without default)
- [ ] Indexes created concurrently (not inline with ALTER TABLE on large tables)
- [ ] Data backfill is a separate migration from schema change
- [ ] Rollback plan documented

## PostgreSQL Patterns

### Adding a Column Safely

```sql
-- GOOD: Nullable column
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- GOOD: Column with default (Postgres 11+ is instant)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- BAD: NOT NULL without default (locks table, rewrites all rows)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
```

### Adding an Index Without Downtime

```sql
-- BAD: Blocks writes on large tables
CREATE INDEX idx_users_email ON users (email);

-- GOOD: Non-blocking
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

### Renaming a Column (Zero-Downtime)

Use the expand-contract pattern:

```sql
-- Migration 1: Add new column
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Migration 2: Backfill data (separate migration)
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- Deploy app to read/write both columns

-- Migration 3: Drop old column (after app no longer references it)
ALTER TABLE users DROP COLUMN username;
```

## Prisma Workflow

```bash
# Create migration from schema changes
npx prisma migrate dev --name add_user_avatar

# Apply pending migrations in production
npx prisma migrate deploy

# Generate client after schema changes
npx prisma generate
```

### Custom SQL Migration (for CONCURRENTLY etc.)

```bash
# Create empty migration, edit manually
npx prisma migrate dev --create-only --name add_email_index
```

```sql
-- migrations/20240115_add_email_index/migration.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

## Zero-Downtime Strategy (Expand-Contract)

```
Phase 1: EXPAND
  - Add new column/table (nullable or with default)
  - Deploy: app writes to BOTH old and new
  - Backfill existing data

Phase 2: MIGRATE
  - Deploy: app reads from NEW, writes to BOTH
  - Verify data consistency

Phase 3: CONTRACT
  - Deploy: app only uses NEW
  - Drop old column/table in separate migration
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|-------------|-------------|-----------------|
| Manual SQL in production | No audit trail, unrepeatable | Always use migration files |
| Editing deployed migrations | Causes drift between environments | Create new migration instead |
| NOT NULL without default | Locks table, rewrites all rows | Add nullable, backfill, then add constraint |
| Inline index on large table | Blocks writes during build | CREATE INDEX CONCURRENTLY |
| Schema + data in one migration | Hard to rollback | Separate migrations |
| Dropping column before removing code | Application errors | Remove code first, drop column next deploy |
