# 🏏 Actonians CC Fantasy League — Deployment Guide

## What you've got
A full React web app with:
- Email/password login & registration
- Weekly team selection (11 players, £100m budget, captain & VC)
- Live leaderboard (overall + per week)
- Dashboard with scoring guide
- Mobile-friendly design in Actonians navy & green

---

## STEP 1 — Set up Supabase (your free database) ~10 mins

1. Go to **supabase.com** → click "Start your project" → sign up free
2. Click "New project" → name it "actonians-fantasy" → pick a strong database password → choose Europe (London) region → Create project
3. Wait ~2 minutes for it to set up
4. Click **SQL Editor** in the left sidebar → **New query**
5. Open the file `SETUP_DATABASE.sql` from this folder, copy everything, paste it in, click **Run**
6. You should see "Success. No rows returned"

### Get your API keys:
- Go to **Settings** → **API** in your Supabase project
- Copy "Project URL" and "anon public" key
- Open `src/lib/supabase.js` in this folder
- Replace `YOUR_SUPABASE_URL` with your Project URL
- Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

---

## STEP 2 — Add your real squad ~5 mins

In Supabase, go to **SQL Editor** → **New query** and run:

```sql
-- First delete the placeholder players
DELETE FROM players;

-- Add YOUR actual Actonians squad (adjust names, roles, prices)
INSERT INTO players (name, role, price) VALUES
  ('Your Player Name', 'bat', 10.0),
  -- bat = batter, bowl = bowler, wk = wicketkeeper, all = all-rounder
  -- Price tips: star players 10-12, regulars 7-9, fringe 6-7
  -- All prices should total enough that people can afford 11 players from £100m budget
  ('Another Player', 'bowl', 8.5);
```

---

## STEP 3 — Deploy to Vercel (free hosting) ~10 mins

1. Go to **github.com** → sign up free → create a new repository called "actonians-fantasy"
2. Upload all files from this folder to that repository
3. Go to **vercel.com** → sign up free (use your GitHub account)
4. Click "Add New Project" → import your GitHub repo → click Deploy
5. Vercel builds it automatically — takes about 2 minutes
6. You'll get a free URL like `actonians-fantasy.vercel.app`

### Custom domain (optional, £10/year):
- Buy `actoniansfantasy.co.uk` from Namecheap or 123-reg
- In Vercel → your project → Settings → Domains → add your domain
- Follow the DNS instructions (takes ~1 hour to propagate)

---

## STEP 4 — Add match weeks

Before each match, add a new week in Supabase SQL Editor:

```sql
-- Mark old week as inactive
UPDATE weeks SET is_active = FALSE;

-- Add new week
INSERT INTO weeks (label, match_date, is_active)
VALUES ('Week 2 vs Twickenham CC', '2025-05-17', TRUE);
```

---

## STEP 5 — Enter match results (after each game)

After a match, enter each player's performance in Supabase:

```sql
-- Example: James Smith scored 67 runs and took 2 catches
-- First get the player ID:
SELECT id, name FROM players WHERE name = 'James Smith';

-- Then insert their score (replace 1 with their actual id, 2 with the week id):
INSERT INTO player_scores (player_id, week_id, runs, wickets, catches, stumpings, run_outs)
VALUES (1, 2, 67, 0, 2, 0, 0);

-- The points calculate automatically from the calculate_points() function
-- But you need to set them manually for now:
UPDATE player_scores
SET points = calculate_points(runs, wickets, catches, stumpings, run_outs)
WHERE week_id = 2;
```

After entering all scores, update each fantasy team's points:

```sql
-- Update all team scores for week 2 (replace 2 with your week id)
DO $$
DECLARE
  team RECORD;
  total INT;
  p_id INT;
  p_pts INT;
  cap_pts INT;
  vc_pts INT;
BEGIN
  FOR team IN SELECT * FROM user_teams WHERE week_id = 2 LOOP
    total := 0;
    FOREACH p_id IN ARRAY team.player_ids LOOP
      SELECT COALESCE(points, 0) INTO p_pts FROM player_scores WHERE player_id = p_id AND week_id = 2;
      IF p_id = team.captain_id THEN
        total := total + (p_pts * 2);
      ELSIF p_id = team.vice_captain_id THEN
        total := total + (p_pts * 3 / 2);
      ELSE
        total := total + p_pts;
      END IF;
    END LOOP;
    UPDATE user_teams SET total_points = total WHERE id = team.id;
  END LOOP;
END $$;

-- Then update season totals
UPDATE profiles p
SET total_points = (
  SELECT COALESCE(SUM(ut.total_points), 0)
  FROM user_teams ut WHERE ut.user_id = p.id
);
```

---

## Sharing with club members

Once deployed, share the Vercel URL with your club WhatsApp group. Members:
1. Go to the URL
2. Click "Create an account"
3. Enter their name, pick a team name, and create a password
4. Pick their XI before the weekly deadline

---

## Customising scoring rules

Edit the `calculate_points()` function in Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION calculate_points(
  p_runs INT, p_wickets INT, p_catches INT,
  p_stumpings INT, p_run_outs INT
) RETURNS INT AS $$
DECLARE pts INT := 4;
BEGIN
  -- Change any of these numbers to adjust scoring
  pts := pts + p_runs;                              -- 1pt per run
  IF p_runs >= 100 THEN pts := pts + 16; END IF;   -- century bonus
  IF p_runs >= 50  THEN pts := pts + 8;  END IF;   -- fifty bonus
  IF p_runs = 0    THEN pts := pts - 4;  END IF;   -- duck penalty
  pts := pts + (p_wickets * 25);                    -- 25pts per wicket
  IF p_wickets >= 5 THEN pts := pts + 20; END IF;  -- 5-for bonus
  pts := pts + (p_catches * 8);                     -- 8pts per catch
  pts := pts + (p_stumpings * 12);                  -- 12pts per stumping
  pts := pts + (p_run_outs * 8);                    -- 8pts per run out
  RETURN pts;
END;
$$ LANGUAGE plpgsql;
```

---

## Questions?

The whole stack is:
- **React** (frontend) — runs in the browser
- **Supabase** (database + auth) — free tier handles thousands of users
- **Vercel** (hosting) — free tier, auto-deploys when you push changes to GitHub

Total ongoing cost: **£10/year** (domain only, if you want one).
