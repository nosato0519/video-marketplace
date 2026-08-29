export async function settlePayoutEarnings(db, payoutId) {
  await db.query(
    `UPDATE seller_earnings e
        SET status = 'paid',
            paid_at = COALESCE(paid_at, NOW())
      WHERE e.status = 'available'
        AND EXISTS (
          SELECT 1
            FROM payout_earnings_allocations a
           WHERE a.payout_id = $1
             AND a.seller_earning_id = e.id
        )
        AND e.net_amount <= (
          SELECT COALESCE(SUM(a2.amount), 0)
            FROM payout_earnings_allocations a2
            JOIN payouts p2 ON p2.id = a2.payout_id
           WHERE a2.seller_earning_id = e.id
             AND p2.status = 'paid'
        )`,
    [payoutId]
  );
}
