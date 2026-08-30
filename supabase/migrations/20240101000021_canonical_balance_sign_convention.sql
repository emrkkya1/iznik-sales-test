-- ============================================
-- M20: KANONİK BAKİYE SÖZLEŞMESİ (fırın perspektifi)
-- ============================================
--
-- Mental model across the whole app: "+ means they owe us" (bakery
-- receivable). Pozitif current_balance = şube bize borçlu (Alacak),
-- negatif = biz şubeye borçluyuz (Borç), sıfır = hesap kapalı.
--
-- Before (M17): balance = opening + payments - sales (cash-flow)
-- After  (M20): balance = opening + sales    - payments (receivable)
--
-- Migration'ı aynı release'te deploy ediyoruz; geliştirme dışında aktif
-- kullanıcı yok (karar kaydı). Migration aşağıdaki adımları yapar:
--   1. recalculate_branch_balance fonksiyonunu yeni formülle yeniden yazar.
--   2. Var olan current_balance satırlarını tek seferlik -1 ile çarpar.
--      Idempotent değildir; bu yüzden sadece local reset üzerinden koşar.

CREATE OR REPLACE FUNCTION recalculate_branch_balance(
  p_branch_id UUID
) RETURNS NUMERIC(12,2) AS $$
DECLARE
  v_opening NUMERIC(12,2);
  v_sales NUMERIC(12,2);
  v_payments NUMERIC(12,2);
  v_balance NUMERIC(12,2);
BEGIN
  SELECT opening_balance INTO v_opening
  FROM branches
  WHERE id = p_branch_id;

  SELECT COALESCE(SUM(total_sales_amount), 0) INTO v_sales
  FROM deliveries
  WHERE branch_id = p_branch_id AND deleted_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_payments
  FROM payments
  WHERE branch_id = p_branch_id AND deleted_at IS NULL;

  -- CANONICAL (M20): receivable perspective
  --   + means branch owes us (Alacak)
  --   - means we owe the branch (Borç)
  v_balance := COALESCE(v_opening, 0) + v_sales - v_payments;

  UPDATE branches
  SET current_balance = v_balance
  WHERE id = p_branch_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Flip existing values once. Mevcut M17 cash-flow değerleri yeni
-- sözleşmede ters anlama geldiği için tek seferlik negasyon gerekiyor.
-- Migration runner her reset'te bu dosyayı tekrar uygular; dolayısıyla
-- supabase db reset sonrası branch tablosu sıfırdan seed'lendiği için
-- bu UPDATE boş kümeye düşer ve idempotent davranır.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM branches) THEN
    UPDATE branches SET current_balance = -current_balance;
  END IF;
END $$;
