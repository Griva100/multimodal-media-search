CREATE TABLE IF NOT EXISTS media_users (
  id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL,
  password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES media_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS media_sessions_user_idx ON media_sessions(user_id);
CREATE TABLE IF NOT EXISTS media_auth_attempts (
  key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES media_users(id) ON DELETE CASCADE,
  title text NOT NULL, kind text NOT NULL CHECK(kind IN ('image','audio','text')),
  description text NOT NULL, tags jsonb NOT NULL DEFAULT '[]', content text NOT NULL,
  vector jsonb NOT NULL, file_data bytea, filename text, mime text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(file_data) <= 2097152)
);
CREATE INDEX IF NOT EXISTS media_assets_user_created_idx ON media_assets(user_id,created_at DESC);
