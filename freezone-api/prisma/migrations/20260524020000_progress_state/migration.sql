-- Cross-session progress state for the FreeZone overhaul. Additive only;
-- existing data is untouched and any previous attempt to apply the same
-- statements is a no-op thanks to IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "ProgressState" (
  "id"         SERIAL PRIMARY KEY,
  "sprint"     TEXT NOT NULL,
  "step"       TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'pending',
  "startedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "notes"      TEXT,
  "owner"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProgressState_sprint_step_key" ON "ProgressState"("sprint", "step");
CREATE INDEX        IF NOT EXISTS "ProgressState_status_idx"      ON "ProgressState"("status");
CREATE INDEX        IF NOT EXISTS "ProgressState_sprint_idx"      ON "ProgressState"("sprint");
