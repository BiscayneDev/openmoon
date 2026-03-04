-- ============================================================
-- OpenMoon — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE cycle_status AS ENUM ('draft', 'upcoming', 'active', 'judging', 'ended');
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'under_review', 'scored', 'winner', 'disqualified');
CREATE TYPE user_role AS ENUM ('participant', 'partner', 'judge', 'admin');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE prize_currency AS ENUM ('USDC', 'USD', 'ETH', 'SOL', 'custom');

-- ============================================================
-- USERS (mirrors auth.users via trigger)
-- ============================================================
CREATE TABLE users (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT,
  github_username      TEXT,
  display_name         TEXT,
  avatar_url           TEXT,
  bio                  TEXT,
  wallet_address       TEXT,          -- for prize payout (any chain)
  role                 user_role NOT NULL DEFAULT 'participant',
  partner_id           UUID,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  onboarding_complete  BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role           ON users(role);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PARTNERS
-- ============================================================
CREATE TABLE partners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  website_url     TEXT,
  description     TEXT,
  contact_email   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT fk_users_partner
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL;

-- ============================================================
-- MOONCYCLES
-- ============================================================
CREATE TABLE mooncycles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  theme            TEXT,
  status           cycle_status NOT NULL DEFAULT 'draft',
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  judging_ends_at  TIMESTAMPTZ,
  announcement_at  TIMESTAMPTZ,
  main_prize_usdc  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_prize_pool NUMERIC(12,2) NOT NULL DEFAULT 0,
  banner_url       TEXT,
  rules_md         TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (ends_at > starts_at)
);

CREATE INDEX idx_mooncycles_status    ON mooncycles(status);
CREATE INDEX idx_mooncycles_starts_at ON mooncycles(starts_at DESC);

-- ============================================================
-- CHALLENGES
-- ============================================================
CREATE TABLE challenges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id          UUID NOT NULL REFERENCES mooncycles(id) ON DELETE CASCADE,
  partner_id        UUID REFERENCES partners(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT NOT NULL,
  requirements_md   TEXT,
  -- judging_criteria: [{name, weight, description}, ...]
  judging_criteria  JSONB,
  prize_amount      NUMERIC(12,2),
  prize_currency    prize_currency NOT NULL DEFAULT 'USDC',
  prize_description TEXT,
  max_winners       INT NOT NULL DEFAULT 1,
  is_main_challenge BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INT NOT NULL DEFAULT 0,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cycle_id, slug)
);

CREATE INDEX idx_challenges_cycle_id   ON challenges(cycle_id);
CREATE INDEX idx_challenges_partner_id ON challenges(partner_id);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE TABLE submissions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id              UUID NOT NULL REFERENCES mooncycles(id),
  team_name             TEXT NOT NULL,
  project_title         TEXT NOT NULL,
  tagline               TEXT,
  description           TEXT NOT NULL,
  problem_statement     TEXT,
  solution_description  TEXT,
  tech_stack            TEXT[],
  -- MoonPay-specific: which agent features they used
  moonpay_features      TEXT[],
  github_url            TEXT,
  demo_url              TEXT,
  demo_video_url        TEXT,
  deck_url              TEXT,
  additional_links      JSONB,
  status                submission_status NOT NULL DEFAULT 'draft',
  submitted_at          TIMESTAMPTZ,
  analysis_status       analysis_status NOT NULL DEFAULT 'pending',
  ai_analysis           JSONB,
  final_score           NUMERIC(5,2),
  judge_notes           TEXT,
  is_public             BOOLEAN NOT NULL DEFAULT false,
  created_by            UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_cycle_id        ON submissions(cycle_id);
CREATE INDEX idx_submissions_status          ON submissions(status);
CREATE INDEX idx_submissions_created_by      ON submissions(created_by);
CREATE INDEX idx_submissions_analysis_status ON submissions(analysis_status);

-- ============================================================
-- SUBMISSION <-> CHALLENGES (many-to-many)
-- ============================================================
CREATE TABLE submission_challenges (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  challenge_id   UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, challenge_id)
);

CREATE INDEX idx_sub_challenges_submission_id ON submission_challenges(submission_id);
CREATE INDEX idx_sub_challenges_challenge_id  ON submission_challenges(challenge_id);

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE TABLE team_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  display_name    TEXT NOT NULL,
  email           TEXT,
  wallet_address  TEXT,
  github_username TEXT,
  role_in_team    TEXT,
  is_lead         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_members_submission_id ON team_members(submission_id);

-- ============================================================
-- JUDGES
-- ============================================================
CREATE TABLE judges (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id     UUID NOT NULL REFERENCES mooncycles(id) ON DELETE CASCADE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, cycle_id)
);

-- ============================================================
-- SCORES
-- ============================================================
CREATE TABLE scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  judge_id        UUID NOT NULL REFERENCES users(id),
  criteria_scores JSONB NOT NULL DEFAULT '{}',
  overall_score   NUMERIC(5,2) NOT NULL,
  feedback        TEXT,
  is_final        BOOLEAN NOT NULL DEFAULT false,
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, challenge_id, judge_id)
);

CREATE INDEX idx_scores_submission_id ON scores(submission_id);
CREATE INDEX idx_scores_challenge_id  ON scores(challenge_id);

-- ============================================================
-- WINNERS
-- ============================================================
CREATE TABLE winners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id        UUID NOT NULL REFERENCES mooncycles(id),
  challenge_id    UUID NOT NULL REFERENCES challenges(id),
  submission_id   UUID NOT NULL REFERENCES submissions(id),
  place           INT NOT NULL DEFAULT 1,
  prize_amount    NUMERIC(12,2),
  prize_currency  prize_currency,
  prize_notes     TEXT,
  announced_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, place)
);

CREATE INDEX idx_winners_cycle_id     ON winners(cycle_id);
CREATE INDEX idx_winners_challenge_id ON winners(challenge_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_partners_updated_at     BEFORE UPDATE ON partners     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_mooncycles_updated_at   BEFORE UPDATE ON mooncycles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_challenges_updated_at   BEFORE UPDATE ON challenges   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_submissions_updated_at  BEFORE UPDATE ON submissions  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_scores_updated_at       BEFORE UPDATE ON scores       FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners            ENABLE ROW LEVEL SECURITY;
ALTER TABLE mooncycles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners             ENABLE ROW LEVEL SECURITY;

-- Helpers using Supabase native auth.uid()
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS UUID AS $$
  SELECT partner_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS
CREATE POLICY "users_select_all"  ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own"  ON users FOR UPDATE USING (id = auth.uid());

-- PARTNERS
CREATE POLICY "partners_select_active" ON partners FOR SELECT USING (is_active = true OR get_my_role() = 'admin');
CREATE POLICY "partners_admin_all"     ON partners FOR ALL USING (get_my_role() = 'admin');

-- MOONCYCLES
CREATE POLICY "cycles_select_public" ON mooncycles FOR SELECT USING (status != 'draft' OR get_my_role() = 'admin');
CREATE POLICY "cycles_admin_all"     ON mooncycles FOR ALL USING (get_my_role() = 'admin');

-- CHALLENGES
CREATE POLICY "challenges_select_public"  ON challenges FOR SELECT USING (is_active = true OR get_my_role() IN ('admin', 'partner'));
CREATE POLICY "challenges_partner_update" ON challenges FOR UPDATE USING (
  get_my_role() = 'partner' AND partner_id = get_my_partner_id()
);
CREATE POLICY "challenges_admin_all"      ON challenges FOR ALL USING (get_my_role() = 'admin');

-- SUBMISSIONS
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  is_public = true
  OR created_by = auth.uid()
  OR get_my_role() IN ('admin', 'judge')
);
CREATE POLICY "submissions_insert_own"  ON submissions FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "submissions_update_own"  ON submissions FOR UPDATE USING (
  (created_by = auth.uid() AND status = 'draft')
  OR get_my_role() IN ('admin', 'judge')
);

-- SUBMISSION_CHALLENGES
CREATE POLICY "sub_challenges_select" ON submission_challenges FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM submissions s WHERE s.id = submission_id
    AND (s.is_public = true OR s.created_by = auth.uid() OR get_my_role() IN ('admin', 'judge'))
  )
);
CREATE POLICY "sub_challenges_manage" ON submission_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = submission_id AND s.created_by = auth.uid())
  OR get_my_role() = 'admin'
);

-- TEAM_MEMBERS
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM submissions s WHERE s.id = submission_id
    AND (s.is_public = true OR s.created_by = auth.uid() OR get_my_role() IN ('admin', 'judge'))
  )
);
CREATE POLICY "team_members_manage" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = submission_id AND s.created_by = auth.uid())
  OR get_my_role() = 'admin'
);

-- JUDGES
CREATE POLICY "judges_select"    ON judges FOR SELECT USING (get_my_role() IN ('admin', 'judge'));
CREATE POLICY "judges_admin_all" ON judges FOR ALL USING (get_my_role() = 'admin');

-- SCORES
CREATE POLICY "scores_select"      ON scores FOR SELECT USING (judge_id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "scores_insert_judge" ON scores FOR INSERT WITH CHECK (judge_id = auth.uid() AND get_my_role() IN ('judge', 'admin'));
CREATE POLICY "scores_update_judge" ON scores FOR UPDATE USING (judge_id = auth.uid() AND is_final = false);

-- WINNERS
CREATE POLICY "winners_select_announced" ON winners FOR SELECT USING (announced_at IS NOT NULL OR get_my_role() = 'admin');
CREATE POLICY "winners_admin_all"        ON winners FOR ALL USING (get_my_role() = 'admin');
