-- STAY HR demo seed for demo tenant staff

DO $stay_hr_seed$
DECLARE
  v_tenant_id uuid := 'b1111111-2222-4333-8444-555555555501'::uuid;
  v_owner uuid := 'b1111111-2222-4333-8444-555555555521'::uuid;
  v_manager uuid := 'b1111111-2222-4333-8444-555555555522'::uuid;
  v_recep uuid := 'b1111111-2222-4333-8444-555555555523'::uuid;
  v_period date := date_trunc('month', current_date)::date;
  v_today date := current_date;
BEGIN
  INSERT INTO stay_payroll_entries (id, tenant_id, user_id, period_month, base_salary, allowances, deductions, net_pay, status, paid_at)
  VALUES
    ('c1111111-2222-4333-8444-555555555531'::uuid, v_tenant_id, v_owner, v_period, 8000000, 1000000, 0, 9000000, 'paid', now()),
    ('c1111111-2222-4333-8444-555555555532'::uuid, v_tenant_id, v_manager, v_period, 6000000, 500000, 200000, 6300000, 'processed', null),
    ('c1111111-2222-4333-8444-555555555533'::uuid, v_tenant_id, v_recep, v_period, 4500000, 300000, 100000, 4700000, 'draft', null)
  ON CONFLICT (tenant_id, user_id, period_month) DO UPDATE SET
    base_salary = EXCLUDED.base_salary,
    net_pay = EXCLUDED.net_pay,
    status = EXCLUDED.status;

  INSERT INTO stay_attendance_records (id, tenant_id, user_id, work_date, clock_in, status)
  VALUES
    ('c1111111-2222-4333-8444-555555555541'::uuid, v_tenant_id, v_owner, v_today, now() - interval '8 hours', 'present'),
    ('c1111111-2222-4333-8444-555555555542'::uuid, v_tenant_id, v_manager, v_today, now() - interval '7 hours', 'late'),
    ('c1111111-2222-4333-8444-555555555543'::uuid, v_tenant_id, v_recep, v_today, now() - interval '8 hours', 'present')
  ON CONFLICT (tenant_id, user_id, work_date) DO NOTHING;

  INSERT INTO stay_staff_loans (id, tenant_id, user_id, amount, remaining, reason, status)
  VALUES
    ('c1111111-2222-4333-8444-555555555551'::uuid, v_tenant_id, v_manager, 2000000, 1200000, 'Kebutuhan darurat', 'active'),
    ('c1111111-2222-4333-8444-555555555552'::uuid, v_tenant_id, v_recep, 500000, 0, 'Pinjaman kecil', 'paid')
  ON CONFLICT (id) DO NOTHING;
END;
$stay_hr_seed$;
