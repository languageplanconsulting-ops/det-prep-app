export type MockAttemptRow = {
  id: string;
  session_id: string;
  set_id: string;
  created_at: string;
  dashboard_saved_at?: string | null;
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  target_total: number | null;
  target_listening: number | null;
  target_speaking: number | null;
  target_reading: number | null;
  target_writing: number | null;
};

export type MockSetRow = { id: string; name: string; stepCount: number };

export type MockSetGroup = {
  key: string;
  label: string;
  rows: MockSetRow[];
};

/** Per-set computed stats derived from attempts. */
export type SetAttemptStats = {
  attemptCount: number;
  lastAttempt?: MockAttemptRow;
  bestAttempt?: MockAttemptRow;
};

/** Aggregated stats for one month group, used by the past-months accordion. */
export type GroupStats = {
  attemptedSetCount: number;
  totalSetCount: number;
  avgScore: number | null;
  lastScores: Array<number | null>;
};
