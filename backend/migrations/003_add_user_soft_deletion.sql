-- Keep historical orders and audit records intact when a staff account is removed.
-- A removed account can no longer authenticate or appear in staff management.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_active
  ON users (id)
  WHERE deleted_at IS NULL;
