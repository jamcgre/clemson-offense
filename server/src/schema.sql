CREATE TABLE IF NOT EXISTS games (
  id BIGINT PRIMARY KEY,
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  season_type TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_points INTEGER,
  away_points INTEGER,
  venue TEXT,
  neutral_site BOOLEAN NOT NULL DEFAULT FALSE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  opponent_defense_ppa DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS drives (
  id TEXT PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  offense TEXT NOT NULL,
  defense TEXT NOT NULL,
  drive_number INTEGER,
  plays INTEGER,
  yards INTEGER,
  drive_result TEXT,
  start_yards_to_goal INTEGER,
  end_yards_to_goal INTEGER,
  start_offense_score INTEGER,
  end_offense_score INTEGER,
  start_defense_score INTEGER,
  start_period INTEGER,
  scoring BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  drive_id TEXT,
  season INTEGER NOT NULL,
  week INTEGER,
  offense TEXT NOT NULL,
  defense TEXT NOT NULL,
  down INTEGER,
  distance INTEGER,
  yards_to_goal INTEGER,
  yards_gained INTEGER,
  play_type TEXT,
  play_text TEXT,
  ppa DOUBLE PRECISION,
  scoring BOOLEAN NOT NULL DEFAULT FALSE,
  period INTEGER
);

-- Season PPA comes from /ppa/teams. Havoc comes from /stats/season/advanced.
CREATE TABLE IF NOT EXISTS season_ppa (
  season INTEGER PRIMARY KEY,
  team TEXT NOT NULL,
  conference TEXT,
  overall DOUBLE PRECISION,
  passing DOUBLE PRECISION,
  rushing DOUBLE PRECISION,
  first_down DOUBLE PRECISION,
  second_down DOUBLE PRECISION,
  third_down DOUBLE PRECISION,
  cumulative_total DOUBLE PRECISION,
  cumulative_passing DOUBLE PRECISION,
  cumulative_rushing DOUBLE PRECISION,
  havoc_total DOUBLE PRECISION,
  havoc_front_seven DOUBLE PRECISION,
  havoc_db DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS games_season_idx ON games (season);
CREATE INDEX IF NOT EXISTS drives_season_idx ON drives (season);
CREATE INDEX IF NOT EXISTS drives_game_idx ON drives (game_id);
CREATE INDEX IF NOT EXISTS plays_season_idx ON plays (season);
CREATE INDEX IF NOT EXISTS plays_game_idx ON plays (game_id);
