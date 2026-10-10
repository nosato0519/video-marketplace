CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  subject TEXT NOT NULL CHECK (length(trim(subject)) BETWEEN 1 AND 200),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_threads_created_by_updated
  ON message_threads (created_by, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_assigned_to_updated
  ON message_threads (assigned_to, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON messages (thread_id, created_at ASC);
