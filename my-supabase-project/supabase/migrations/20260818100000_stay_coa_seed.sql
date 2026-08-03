-- Seed default COA, payment methods, and migrate existing stay_payments

DO $coa_seed$
DECLARE
  v_tenant RECORD;
  v_coa_cash UUID;
  v_coa_bank UUID;
  v_coa_xendit_recv UUID;
  v_coa_xendit_bal UUID;
  v_coa_transfer_recv UUID;
  v_coa_room_rev UUID;
  v_coa_deferred UUID;
  v_coa_pg_fee UUID;
  v_coa_payroll UUID;
  v_coa_opex UUID;
  v_coa_staff_loan UUID;
  v_coa_tax UUID;
  v_coa_refund UUID;
  v_journal_id UUID;
  v_tx_id UUID;
  v_pm_cash UUID;
  v_pm_transfer UUID;
  v_pm_qris UUID;
  v_pm_va UUID;
  v_pm_ewallet UUID;
  v_pm_card UUID;
  v_pay RECORD;
BEGIN
  FOR v_tenant IN SELECT id FROM stay_tenants LOOP
    -- Skip if COA already seeded
    IF EXISTS (SELECT 1 FROM stay_chart_of_accounts WHERE tenant_id = v_tenant.id AND code = '1100') THEN
      CONTINUE;
    END IF;

    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '1100', 'Kas Tunai', 'asset', true) RETURNING id INTO v_coa_cash;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '1200', 'Kas Bank', 'asset', true) RETURNING id INTO v_coa_bank;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '1300', 'Piutang Xendit', 'asset', true) RETURNING id INTO v_coa_xendit_recv;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '1310', 'Saldo Xendit', 'asset', true) RETURNING id INTO v_coa_xendit_bal;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '1320', 'Piutang Transfer', 'asset', true) RETURNING id INTO v_coa_transfer_recv;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '4100', 'Pendapatan Kamar', 'revenue', true) RETURNING id INTO v_coa_room_rev;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '2300', 'Pendapatan Diterima Dimuka', 'liability', true) RETURNING id INTO v_coa_deferred;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '5100', 'Biaya Payment Gateway', 'expense', true) RETURNING id INTO v_coa_pg_fee;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '5200', 'Beban Gaji', 'expense', true) RETURNING id INTO v_coa_payroll;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '5300', 'Beban Operasional', 'expense', true) RETURNING id INTO v_coa_opex;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '1400', 'Piutang Karyawan', 'asset', true) RETURNING id INTO v_coa_staff_loan;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '2100', 'Hutang Pajak', 'liability', true) RETURNING id INTO v_coa_tax;
    INSERT INTO stay_chart_of_accounts (tenant_id, code, name, account_type, is_system) VALUES
      (v_tenant.id, '4200', 'Pengembalian Pendapatan', 'revenue', true) RETURNING id INTO v_coa_refund;

    -- Default payment methods
    INSERT INTO stay_payment_methods (tenant_id, code, name, category, fee_type, fee_amount, fee_percent, sort_order) VALUES
      (v_tenant.id, 'cash', 'Tunai', 'cash', 'none', 0, 0, 1) RETURNING id INTO v_pm_cash;
    INSERT INTO stay_payment_methods (tenant_id, code, name, category, fee_type, fee_amount, fee_percent, sort_order) VALUES
      (v_tenant.id, 'transfer', 'Transfer Bank', 'transfer', 'none', 0, 0, 2) RETURNING id INTO v_pm_transfer;
    INSERT INTO stay_payment_methods (tenant_id, code, name, category, fee_type, fee_amount, fee_percent, sort_order) VALUES
      (v_tenant.id, 'qris', 'QRIS', 'xendit_qris', 'percent', 0, 0.007, 3) RETURNING id INTO v_pm_qris;
    INSERT INTO stay_payment_methods (tenant_id, code, name, category, fee_type, fee_amount, fee_percent, sort_order) VALUES
      (v_tenant.id, 'virtual_account', 'Virtual Account', 'xendit_va', 'fixed', 4000, 0, 4) RETURNING id INTO v_pm_va;
    INSERT INTO stay_payment_methods (tenant_id, code, name, category, fee_type, fee_amount, fee_percent, sort_order) VALUES
      (v_tenant.id, 'ewallet', 'E-Wallet', 'xendit_ewallet', 'percent', 0, 0.015, 5) RETURNING id INTO v_pm_ewallet;
    INSERT INTO stay_payment_methods (tenant_id, code, name, category, fee_type, fee_amount, fee_percent, sort_order) VALUES
      (v_tenant.id, 'credit_card', 'Kartu Kredit/Debit', 'xendit_card', 'mixed', 2000, 0.029, 6) RETURNING id INTO v_pm_card;

    -- Default bank account for demo
    INSERT INTO stay_tenant_bank_accounts (tenant_id, bank_code, bank_name, account_number, account_holder, is_primary)
    VALUES (v_tenant.id, 'BCA', 'Bank Central Asia', '1234567890', 'Demo Villa STAY', true)
    ON CONFLICT DO NOTHING;

    -- Migrate existing stay_payments to pos_transactions
    FOR v_pay IN
      SELECT p.*, b.guest_id
      FROM stay_payments p
      JOIN stay_bookings b ON b.id = p.booking_id
      WHERE p.tenant_id = v_tenant.id AND p.pos_transaction_id IS NULL
    LOOP
      v_tx_id := gen_random_uuid();
      INSERT INTO stay_pos_transactions (
        id, tenant_id, transaction_number, booking_id, guest_id,
        transaction_type, subtotal, grand_total, status, created_at
      ) VALUES (
        v_tx_id,
        v_pay.tenant_id,
        stay_next_transaction_number(v_pay.tenant_id),
        v_pay.booking_id,
        v_pay.guest_id,
        'sale',
        v_pay.amount,
        v_pay.amount,
        CASE WHEN v_pay.status IN ('paid', 'partial') THEN 'paid' ELSE 'pending' END,
        v_pay.created_at
      );

      INSERT INTO stay_pos_transaction_items (
        transaction_id, item_type, description, quantity, unit_price, subtotal
      ) VALUES (
        v_tx_id, 'room', 'Pembayaran booking (migrasi)', 1, v_pay.amount, v_pay.amount
      );

      INSERT INTO stay_pos_transaction_payments (
        transaction_id,
        payment_method_id,
        amount,
        status,
        reference_number,
        external_id,
        payment_url,
        expiry_at
      ) VALUES (
        v_tx_id,
        CASE v_pay.method
          WHEN 'cash' THEN v_pm_cash
          WHEN 'transfer' THEN v_pm_transfer
          WHEN 'qris' THEN v_pm_qris
          WHEN 'virtual_account' THEN v_pm_va
          WHEN 'ewallet' THEN v_pm_ewallet
          WHEN 'credit_card' THEN v_pm_card
          ELSE v_pm_cash
        END,
        v_pay.amount,
        CASE WHEN v_pay.status = 'paid' THEN 'paid' ELSE 'pending' END,
        v_pay.reference_number,
        v_pay.external_id,
        v_pay.payment_url,
        v_pay.expiry_date
      );

      UPDATE stay_payments SET pos_transaction_id = v_tx_id WHERE id = v_pay.id;

      -- Retroactive journal for paid payments
      IF v_pay.status = 'paid' THEN
        v_journal_id := gen_random_uuid();
        INSERT INTO stay_journal_entries (id, tenant_id, entry_date, description, source_type, source_id, is_posted)
        VALUES (
          v_journal_id, v_pay.tenant_id, v_pay.created_at::DATE,
          'Migrasi pembayaran ' || v_pay.id, 'migration', v_tx_id, true
        );

        IF v_pay.method IN ('virtual_account', 'ewallet', 'qris', 'credit_card') OR v_pay.external_id IS NOT NULL THEN
          INSERT INTO stay_journal_lines (journal_id, account_id, debit, credit, memo) VALUES
            (v_journal_id, v_coa_xendit_bal, v_pay.amount, 0, 'Saldo Xendit'),
            (v_journal_id, v_coa_room_rev, 0, v_pay.amount, 'Pendapatan Kamar');
        ELSIF v_pay.method = 'transfer' THEN
          INSERT INTO stay_journal_lines (journal_id, account_id, debit, credit, memo) VALUES
            (v_journal_id, v_coa_bank, v_pay.amount, 0, 'Kas Bank'),
            (v_journal_id, v_coa_room_rev, 0, v_pay.amount, 'Pendapatan Kamar');
        ELSE
          INSERT INTO stay_journal_lines (journal_id, account_id, debit, credit, memo) VALUES
            (v_journal_id, v_coa_cash, v_pay.amount, 0, 'Kas Tunai'),
            (v_journal_id, v_coa_room_rev, 0, v_pay.amount, 'Pendapatan Kamar');
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$coa_seed$;
