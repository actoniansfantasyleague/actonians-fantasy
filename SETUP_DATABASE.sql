-- ============================================
-- ACTONIANS CC FANTASY LEAGUE — DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- supabase.com → your project → SQL Editor → New query
-- ============================================

-- PLAYERS table: your Actonians squad
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('bat', 'bowl', 'wk', 'all')),
  price NUMERIC(4,1) NOT NULL DEFAULT 8.0,
  total_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WEEKS table: each gameweek / match
CREATE TABLE weeks (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,          -- e.g. "Week 1 vs Richmond CC"
  match_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_scored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYER_SCORES: points earned by each player each week
CREATE TABLE player_scores (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  week_id INT REFERENCES weeks(id),
  runs INT DEFAULT 0,
  wickets INT DEFAULT 0,
  catches INT DEFAULT 0,
  stumpings INT DEFAULT 0,
  run_outs INT DEFAULT 0,
  points INT DEFAULT 0,
  UNIQUE(player_id, week_id)
);

-- USER_TEAMS: each member's team selection per week
CREATE TABLE user_teams (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  week_id INT REFERENCES weeks(id),
  player_ids INT[] NOT NULL,          -- array of 11 player IDs
  captain_id INT REFERENCES players(id),
  vice_captain_id INT REFERENCES players(id),
  total_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_id)
);

-- PROFILES: display name for each user
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  team_name TEXT NOT NULL DEFAULT 'My Fantasy XI',
  total_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEED: Add your Actonians squad here
-- Replace these names with your real players!
-- ============================================
INSERT INTO players (name, role, price) VALUES
  ('James Smith',    'bat',  10.5),
  ('Arun Patel',     'bat',   9.0),
  ('Tom Davies',     'bat',   8.5),
  ('Marcus Webb',    'bat',   8.0),
  ('Felix Hassan',   'bat',   7.5),
  ('Ryan Khan',      'bowl',  9.5),
  ('Sam Williams',   'bowl',  9.0),
  ('Chris Mensah',   'bowl',  8.0),
  ('George Singh',   'bowl',  7.5),
  ('Dan Roberts',    'bowl',  7.0),
  ('Peter Gupta',    'wk',    9.0),
  ('Leon Thompson',  'all',  11.0),
  ('Ben Nwosu',      'all',  10.0),
  ('Kofi Adeyemi',   'all',   9.5),
  ('Harry Lee',      'all',   8.5);

-- ============================================
-- SEED: Add your first match week
-- ============================================
INSERT INTO weeks (label, match_date, is_active) VALUES
  ('Week 1 — First match', CURRENT_DATE, TRUE);

-- ============================================
-- ROW LEVEL SECURITY (keeps data safe)
-- ============================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read players, weeks, scores
CREATE POLICY "public read players" ON players FOR SELECT USING (true);
CREATE POLICY "public read weeks" ON weeks FOR SELECT USING (true);
CREATE POLICY "public read scores" ON player_scores FOR SELECT USING (true);

-- Users can only read/write their own teams
CREATE POLICY "own teams select" ON user_teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own teams insert" ON user_teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own teams update" ON user_teams FOR UPDATE USING (auth.uid() = user_id);

-- Profiles: anyone can read, only owner can write
CREATE POLICY "public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- FUNCTION: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, team_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Manager'), 'My Fantasy XI');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNCTION: calculate points for a player score
-- Called manually after you enter results
-- ============================================
CREATE OR REPLACE FUNCTION calculate_points(
  p_runs INT, p_wickets INT, p_catches INT,
  p_stumpings INT, p_run_outs INT
) RETURNS INT AS $$
DECLARE
  pts INT := 4; -- appearance bonus
BEGIN
  pts := pts + p_runs;
  IF p_runs >= 100 THEN pts := pts + 16; END IF;
  IF p_runs >= 50  THEN pts := pts + 8;  END IF;
  IF p_runs = 0    THEN pts := pts - 4;  END IF; -- duck
  pts := pts + (p_wickets * 25);
  IF p_wickets >= 5 THEN pts := pts + 20; END IF;
  pts := pts + (p_catches * 8);
  pts := pts + (p_stumpings * 12);
  pts := pts + (p_run_outs * 8);
  RETURN pts;
END;
$$ LANGUAGE plpgsql;
