-- ============================================
-- PR: Merge delivery + payment into one Hareketler row
-- ============================================
--
-- Replaces list_branch_movements (which returned deliveries and payments as
-- two parallel arrays, paginated independently) with a unified list:
--
--   * 1 row per delivery, with its first active payment embedded as JSONB
--     (or NULL when the delivery has no payment).
--   * 1 row per standalone manual payment (delivery_id IS NULL).
--
-- Sorting + pagination happen at the outer level (after the union) so the
-- page boundaries are global, not per source table. Sort key matches the
-- previous visual order: date DESC, created_at DESC.

DROP FUNCTION IF EXISTS list_branch_movements(UUID, INT, INT);

CREATE OR REPLACE FUNCTION list_deliveries_with_payments(
  p_branch_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_branch_id IS NULL THEN RAISE EXCEPTION 'branch_id is required'; END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_data)
    FROM (
      SELECT row_data
      FROM (
        -- Deliveries with their associated payment (if any)
        SELECT
          jsonb_build_object(
            'id', d.id::text,
            'kind', 'delivery',
            'date', d.date,
            'amount', d.total_sales_amount,
            'isDeleted', d.deleted_at IS NOT NULL,
            'createdAt', d.created_at,
            'payment', CASE WHEN pay.id IS NOT NULL THEN
              jsonb_build_object(
                'id', pay.id::text,
                'amount', pay.amount,
                'paymentType', pay.payment_type,
                'createdAt', pay.created_at
              )
            ELSE NULL END
          ) AS row_data,
          d.date AS bucket_date,
          d.created_at
        FROM deliveries d
        LEFT JOIN LATERAL (
          SELECT * FROM payments
          WHERE delivery_id = d.id AND deleted_at IS NULL
          ORDER BY created_at ASC
          LIMIT 1
        ) pay ON TRUE
        WHERE d.branch_id = p_branch_id

        UNION ALL

        -- Manual payments (delivery_id IS NULL)
        SELECT
          jsonb_build_object(
            'id', pay.id::text,
            'kind', 'payment',
            'date', pay.date,
            'amount', pay.amount,
            'paymentType', pay.payment_type,
            'isDeleted', pay.deleted_at IS NOT NULL,
            'createdAt', pay.created_at
          ) AS row_data,
          pay.date AS bucket_date,
          pay.created_at
        FROM payments pay
        WHERE pay.branch_id = p_branch_id
          AND pay.delivery_id IS NULL
      ) merged
      ORDER BY bucket_date DESC, created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) sub
  ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION list_deliveries_with_payments(UUID, INT, INT) TO authenticated;
