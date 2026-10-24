export async function settlePaidPayoutEarnings(db, payoutId) {
  const payout = await db.query(
    `SELECT id, seller_id, currency, amount, status
       FROM payouts
      WHERE id = $1
      FOR UPDATE`,
    [payoutId]
  );

  if (!payout.rowCount) throw new Error('payout_not_found');
  if (payout.rows[0].status !== 'paid') throw new Error('payout_not_paid');

  await db.query(
    `SELECT id
       FROM seller_earnings
      WHERE id IN (
        SELECT seller_earning_id FROM payout_earnings_allocations WHERE payout_id = $1
        UNION
        SELECT seller_earning_id FROM seller_earning_recovery_offsets WHERE payout_id = $1
      )
      FOR UPDATE`,
    [payoutId]
  );

  const allocations = await db.query(
    `SELECT e.id AS seller_earning_id,
            e.net_amount,
            paid.paid_allocated_amount,
            offsets.recovered_offset_amount
       FROM seller_earnings e
       CROSS JOIN LATERAL (
         SELECT COALESCE(SUM(a.amount) FILTER (WHERE p.status = 'paid'), 0) AS paid_allocated_amount
           FROM payout_earnings_allocations a
           JOIN payouts p ON p.id = a.payout_id
          WHERE a.seller_earning_id = e.id
       ) paid
       CROSS JOIN LATERAL (
         SELECT COALESCE(SUM(o.amount), 0) AS recovered_offset_amount
           FROM seller_earning_recovery_offsets o
          WHERE o.seller_earning_id = e.id
       ) offsets
      WHERE e.id IN (
        SELECT seller_earning_id FROM payout_earnings_allocations WHERE payout_id = $1
        UNION
        SELECT seller_earning_id FROM seller_earning_recovery_offsets WHERE payout_id = $1
      )`,
    [payoutId]
  );

  for (const allocation of allocations.rows) {
    const allocated = Number(allocation.paid_allocated_amount || 0);
    const offset = Number(allocation.recovered_offset_amount || 0);
    const netAmount = Number(allocation.net_amount || 0);
    if (allocated + offset + 0.000001 >= netAmount) {
      await db.query(
        `UPDATE seller_earnings
            SET status = 'paid', paid_at = COALESCE(paid_at, NOW())
          WHERE id = $1
            AND status = 'available'`,
        [allocation.seller_earning_id]
      );
    }
  }

  return allocations.rows.length;
}
