-- STAY PMS schema (multi-tenant with RLS)
-- Run via: supabase db push / migration deploy

-- Tenants (properties)
CREATE TABLE IF NOT EXISTS stay_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  primary_color TEXT DEFAULT '#10b981',
  address TEXT,
  phone TEXT,
  email TEXT,
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '12:00',
  tax_percent NUMERIC(5,2) DEFAULT 10,
  service_charge_percent NUMERIC(5,2) DEFAULT 5,
  currency TEXT DEFAULT 'IDR',
  subscription_plan TEXT DEFAULT 'free',
  subscription_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Staff users linked to auth.users
CREATE TABLE IF NOT EXISTS stay_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'receptionist')),
  phone TEXT,
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS stay_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(12,2) NOT NULL,
  capacity INT DEFAULT 2,
  bed_type TEXT,
  size NUMERIC(6,2),
  facilities JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES stay_room_types(id),
  number TEXT NOT NULL,
  floor INT DEFAULT 1,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'cleaning', 'blocked')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  position_x NUMERIC,
  position_y NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, number)
);

CREATE TABLE IF NOT EXISTS stay_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  id_type TEXT DEFAULT 'ktp',
  id_number TEXT,
  address TEXT,
  nationality TEXT DEFAULT 'Indonesia',
  is_blacklisted BOOLEAN DEFAULT false,
  notes TEXT,
  total_stays INT DEFAULT 0,
  discount_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  booking_code TEXT NOT NULL,
  guest_id UUID NOT NULL REFERENCES stay_guests(id),
  room_id UUID NOT NULL REFERENCES stay_rooms(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  total_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_by UUID REFERENCES stay_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, booking_code)
);

CREATE TABLE IF NOT EXISTS stay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES stay_bookings(id),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'paid',
  reference_number TEXT,
  external_id TEXT,
  payment_url TEXT,
  expiry_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES stay_rooms(id),
  assigned_to UUID REFERENCES stay_users(id),
  status TEXT DEFAULT 'pending',
  type TEXT NOT NULL,
  notes TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  adjustment NUMERIC(6,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stay_accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES stay_tenants(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
  amount NUMERIC(12,2) NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE stay_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_accounting_entries ENABLE ROW LEVEL SECURITY;

-- Helper: current user's tenant
CREATE OR REPLACE FUNCTION stay_current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM stay_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies (tenant isolation)
CREATE POLICY stay_users_tenant ON stay_users FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_room_types_tenant ON stay_room_types FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_rooms_tenant ON stay_rooms FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_guests_tenant ON stay_guests FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_bookings_tenant ON stay_bookings FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_payments_tenant ON stay_payments FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_hk_tenant ON stay_housekeeping_tasks FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_pricing_tenant ON stay_pricing_rules FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_notif_tenant ON stay_notifications FOR ALL USING (tenant_id = stay_current_tenant_id());
CREATE POLICY stay_accounting_tenant ON stay_accounting_entries FOR ALL USING (tenant_id = stay_current_tenant_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stay_bookings_tenant ON stay_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stay_bookings_status ON stay_bookings(status);
CREATE INDEX IF NOT EXISTS idx_stay_payments_booking ON stay_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_stay_rooms_status ON stay_rooms(status);
