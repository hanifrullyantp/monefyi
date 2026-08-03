-- Seed payment methods and migrate existing stay_payments to POS transactions

DO $coa_seed$
DECLARE
  v_tenant RECORD;
  v_pm_cash UUID;
  v_pm_transfer UUID;
  v_pm_qris UUID;
  v_pm_va UUID;
  v_pm_ewallet UUID;
  v_pm_card UUID;
  v_tx_id UUID;
  v_pay RECORD;
  v_coa_cash UUID;
  v_coa_bank UUID;
  v_coa_xendit UUID;
  v_coa_revenue UUID;
  v_journal_lines JSONB;
BEGIN
  FOR v_tenant IN SELECT id FROM stay_tenants LOOP
    PERFORM stay_seed_finance_for_tenant(v_tenant.id);

    IF NOT EXISTS (SELECT 1 FROM stay_payment_methods WHERE tenant_id = v_tenant.id AND code = 'cash') THEN
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
    ELSE
      SELECT id INTO v_pm_cash FROM stay_payment_methods WHERE tenant_id = v_tenant.id AND code = 'cash';
      SELECT id INTO v_pm_transfer FROM stay_payment_methods WHERE tenant_id = v_tenant.id AND code = 'transfer';
      SELECT id INTO v_pm_qris FROM stay_payment_methods WHERE tenant_id = v_tenant.id AND code = 'qris';
      SELECT id INTO v_pm_va FROM stay_payment_methods WHERE tenant_id = v_tenant.id AND code = 'virtual_account';
      SELECT id INTO v_pm_ewallet FROM stay_payment_methods WHERE tenant_id = v_tenant.id AND code = 'ewallet';
      SELECT id INTO v_pm_card FROM stay_payment_methods WHERE tenant_id = v_tenant.id AND code = 'credit_card';
    END IF;

    INSERT INTO stay_tenant_bank_accounts (tenant_id, bank_code, bank_name, account_number, account_holder, is_primary)
    SELECT v_tenant.id, 'BCA', 'Bank Central Asia', '1234567890', 'Demo Villa STAY', true
    WHERE NOT EXISTS (
      SELECT 1 FROM stay_tenant_bank_accounts WHERE tenant_id = v_tenant.id AND bank_code = 'BCA'
    );

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

      IF v_pay.status = 'paid' THEN
        SELECT id INTO v_coa_cash FROM stay_chart_of_accounts WHERE tenant_id = v_tenant.id AND code = '1101';
        SELECT id INTO v_coa_bank FROM stay_chart_of_accounts WHERE tenant_id = v_tenant.id AND code = '1102';
        SELECT id INTO v_coa_xendit FROM stay_chart_of_accounts WHERE tenant_id = v_tenant.id AND code = '1104';
        SELECT id INTO v_coa_revenue FROM stay_chart_of_accounts WHERE tenant_id = v_tenant.id AND code = '4101';

        IF v_coa_revenue IS NOT NULL THEN
          IF v_pay.method IN ('virtual_account', 'ewallet', 'qris', 'credit_card') OR v_pay.external_id IS NOT NULL THEN
            v_journal_lines := jsonb_build_array(
              jsonb_build_object('account_id', v_coa_xendit, 'debit', v_pay.amount, 'credit', 0, 'notes', 'Saldo Xendit'),
              jsonb_build_object('account_id', v_coa_revenue, 'debit', 0, 'credit', v_pay.amount, 'notes', 'Pendapatan Kamar')
            );
          ELSIF v_pay.method = 'transfer' THEN
            v_journal_lines := jsonb_build_array(
              jsonb_build_object('account_id', v_coa_bank, 'debit', v_pay.amount, 'credit', 0, 'notes', 'Kas Bank'),
              jsonb_build_object('account_id', v_coa_revenue, 'debit', 0, 'credit', v_pay.amount, 'notes', 'Pendapatan Kamar')
            );
          ELSE
            v_journal_lines := jsonb_build_array(
              jsonb_build_object('account_id', v_coa_cash, 'debit', v_pay.amount, 'credit', 0, 'notes', 'Kas Tunai'),
              jsonb_build_object('account_id', v_coa_revenue, 'debit', 0, 'credit', v_pay.amount, 'notes', 'Pendapatan Kamar')
            );
          END IF;

          PERFORM stay_post_journal(
            v_pay.tenant_id,
            'JRN-MIG-' || substr(v_tx_id::TEXT, 1, 8),
            v_pay.created_at::DATE,
            'Migrasi pembayaran ' || v_pay.id,
            'payment',
            'pos_transaction',
            v_tx_id,
            v_journal_lines
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$coa_seed$;
