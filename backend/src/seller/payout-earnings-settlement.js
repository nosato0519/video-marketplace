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
        SELECT DISTINCT seller_earning_id
          FROM payout_earnings_allocations
         WHERE payout_id = $1
      )
      FOR UPDATE`,
    [payoutId]
  );

  const allocations = await db.query(
    `SELECT a.seller_earning_id,
            e.net_amount,
            COALESCE(SUM(a.amount) FILTER (WHERE p.status = 'paid'), 0) AS paid_allocated_amount
       FROM payout_earnings_allocations a
       JOIN seller_earnings e ON e.id = a.seller_earning_id
       JOIN payouts p ON p.id = a.payout_id
      WHERE a.seller_earning_id IN (
        SELECT DISTINCT seller_earning_id
          FROM payout_earnings_allocations
         WHERE payout_id = $1
      )
      GROUP BY a.seller_earning_id, e.net_amount`,
    [payoutId]
  );

  for (const allocation of allocations.rows) {
    const allocated = Number(allocation.paid_allocated_amount || 0);
    const netAmount = Number(allocation.net_amount || 0);
    if (allocated + 0.000001 >= netAmount) {
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
