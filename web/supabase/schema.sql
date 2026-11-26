-- VolunteerPulse (TìnhNguyệnMap) — Supabase PostGIS Schema
-- Enables spatial geography columns and Row Level Security (RLS)

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Highland Villages / School Sites
CREATE TABLE IF NOT EXISTS public.vp_villages (
  id text PRIMARY KEY,
  name text NOT NULL,
  commune text NOT NULL DEFAULT '',
  district text NOT NULL,
  province text NOT NULL DEFAULT 'Quảng Nam',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  location geography(Point, 4326),
  distance_km integer NOT NULL DEFAULT 0,
  households integer NOT NULL DEFAULT 0,
  children integer NOT NULL DEFAULT 0,
  difficulty_score double precision NOT NULL DEFAULT 5.0,
  priority text NOT NULL DEFAULT 'high',
  terrain_alerts text[] NOT NULL DEFAULT '{}',
  has_4g boolean NOT NULL DEFAULT false,
  needs jsonb NOT NULL DEFAULT '{"giftBoxes":0,"warmCoats":0,"medicalKits":0,"riceKg":0}'::jsonb,
  required_skills text[] NOT NULL DEFAULT '{}',
  transport_cost_per_trip bigint NOT NULL DEFAULT 0,
  verified_status text NOT NULL DEFAULT 'planned',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Volunteers
CREATE TABLE IF NOT EXISTS public.vp_volunteers (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  student_id text NOT NULL DEFAULT '',
  faculty text NOT NULL DEFAULT '',
  phone_masked text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  highland_trips integer NOT NULL DEFAULT 0,
  availability text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  has_driving_license boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Field Verification Reports (GPS + YOLOv11 + PaddleOCR)
CREATE TABLE IF NOT EXISTS public.vp_field_reports (
  id text PRIMARY KEY,
  village_id text REFERENCES public.vp_villages(id) ON DELETE SET NULL,
  village_name text NOT NULL,
  volunteer_name text NOT NULL,
  timestamp_label text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  location geography(Point, 4326),
  gps_accuracy_meters double precision NOT NULL DEFAULT 5.0,
  exif_verified boolean NOT NULL DEFAULT true,
  sync_status text NOT NULL DEFAULT 'synced',
  leader_approved boolean NOT NULL DEFAULT false,
  photo_type text NOT NULL DEFAULT 'delivery',
  yolo_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  ocr_summary jsonb,
  gemini_audit_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Donor Financial Transparency Ledger
CREATE TABLE IF NOT EXISTS public.vp_transactions (
  id text PRIMARY KEY,
  donor_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('inflow', 'outflow')),
  amount_vnd bigint NOT NULL,
  date_label text NOT NULL,
  village_name text,
  description text NOT NULL,
  verified_receipt_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vp_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_transactions ENABLE ROW LEVEL SECURITY;

-- Public read & app write policies for demo/competition deployment
CREATE POLICY "vp_villages_all" ON public.vp_villages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vp_volunteers_all" ON public.vp_volunteers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vp_field_reports_all" ON public.vp_field_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vp_transactions_all" ON public.vp_transactions FOR ALL USING (true) WITH CHECK (true);

-- 5. Ecosystem Organizations (Commune Youth Unions & DTU Units)
CREATE TABLE IF NOT EXISTS public.vp_organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  org_type text NOT NULL CHECK (org_type IN ('commune_youth', 'dtu_unit')),
  district text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT 'Quảng Nam',
  leader_name text NOT NULL DEFAULT '',
  phone_masked text NOT NULL DEFAULT '',
  strengths text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. DTU Unit Commitments & Co-op Linkages
CREATE TABLE IF NOT EXISTS public.vp_commitments (
  id text PRIMARY KEY,
  village_id text NOT NULL REFERENCES public.vp_villages(id) ON DELETE CASCADE,
  dtu_org_id text NOT NULL DEFAULT '',
  dtu_org_name text NOT NULL,
  commitment_type text NOT NULL DEFAULT 'full' CHECK (commitment_type IN ('full', 'partial', 'co_op')),
  pledged_budget_vnd bigint NOT NULL DEFAULT 0,
  pledged_skills text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vp_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vp_organizations_all" ON public.vp_organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vp_commitments_all" ON public.vp_commitments FOR ALL USING (true) WITH CHECK (true);
