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

  const allocations = await db.query(
    `SELECT a.seller_earning_id,
            e.net_amount,
            COALESCE(SUM(a.amount), 0) AS allocated_amount
       FROM payout_earnings_allocations a
       JOIN seller_earnings e ON e.id = a.seller_earning_id
      WHERE a.payout_id = $1
      GROUP BY a.seller_earning_id, e.net_amount
      FOR UPDATE OF e`,
    [payoutId]
  );

  for (const allocation of allocations.rows) {
    const allocated = Number(allocation.allocated_amount || 0);
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
